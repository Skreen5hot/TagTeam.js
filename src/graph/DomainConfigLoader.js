/**
 * DomainConfigLoader.js
 *
 * Manages loadable domain configuration files for type specialization.
 * Enables domain-neutral core with pluggable domain vocabularies.
 *
 * Phase 2 Implementation:
 * - Load JSON config files for domain-specific type mappings
 * - Specialize BFO types to domain-specific CCO/custom types
 * - Support verb sense overrides based on selectional restrictions
 * - Allow multiple domains to be loaded additively
 *
 * @module graph/DomainConfigLoader
 * @version 4.0.0-phase4
 */

const fs = require('fs');
const path = require('path');

/**
 * Loader for domain-specific configuration files
 *
 * @example
 * const loader = new DomainConfigLoader();
 * loader.loadConfig('config/medical.json');
 * const type = loader.getTypeSpecialization('bfo:BFO_0000015', 'care');
 * // Returns: 'cco:ActOfCare'
 */
class DomainConfigLoader {
  /**
   * Create a new DomainConfigLoader
   */
  constructor() {
    // Map of domain name -> config object
    this.configs = new Map();

    // Merged type specializations from all loaded configs
    // Structure: Map<bfoType, Map<term, specializedType>>
    this.typeSpecializations = new Map();

    // Merged verb overrides from all loaded configs
    // Structure: Map<verb, { objectIsOccurrent, objectIsContinuant, objectIsGDC, default }>
    this.verbOverrides = new Map();

    // Process root words (domain-specific process terms)
    // Structure: Map<term, specializedType>
    this.processRootWords = new Map();

    // Track load order for conflict resolution (last wins)
    this.loadOrder = [];
  }

  /**
   * Load a domain configuration from a JSON file
   *
   * @param {string} configPath - Path to the JSON config file
   * @returns {boolean} True if loaded successfully
   * @throws {Error} If file cannot be read or parsed
   *
   * @example
   * loader.loadConfig('config/medical.json');
   */
  loadConfig(configPath) {
    const absolutePath = path.resolve(configPath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Config file not found: ${absolutePath}`);
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const config = JSON.parse(content);

    return this.loadConfigObject(config);
  }

  /**
   * Load a domain configuration from an object
   *
   * @param {Object} config - Configuration object
   * @param {string} config.domain - Domain name (e.g., 'medical', 'legal')
   * @param {string} config.version - Config version
   * @param {Object} [config.typeSpecializations] - BFO type -> term -> specialized type
   * @param {Object} [config.verbOverrides] - Verb sense overrides
   * @param {Object} [config.processRootWords] - Domain-specific process terms
   * @returns {boolean} True if loaded successfully
   *
   * @example
   * loader.loadConfigObject({
   *   domain: 'medical',
   *   version: '1.0',
   *   typeSpecializations: {
   *     'bfo:BFO_0000015': {
   *       'care': 'cco:ActOfCare'
   *     }
   *   }
   * });
   */
  loadConfigObject(config) {
    // Validate required fields
    if (!config.domain) {
      throw new Error('Config must have a "domain" field');
    }
    if (!config.version) {
      throw new Error('Config must have a "version" field');
    }

    // Check for existing domain (warn on conflict)
    if (this.configs.has(config.domain)) {
      console.warn(
        `Warning: Domain '${config.domain}' already loaded. Overwriting with new config.`
      );
    }

    // Store the config
    this.configs.set(config.domain, config);
    this.loadOrder.push(config.domain);

    // Merge type specializations
    if (config.typeSpecializations) {
      for (const [bfoType, terms] of Object.entries(config.typeSpecializations)) {
        if (!this.typeSpecializations.has(bfoType)) {
          this.typeSpecializations.set(bfoType, new Map());
        }
        const typeMap = this.typeSpecializations.get(bfoType);

        for (const [term, specializedType] of Object.entries(terms)) {
          // Check for conflict
          if (typeMap.has(term) && typeMap.get(term) !== specializedType) {
            console.warn(
              `Warning: Term '${term}' already mapped to '${typeMap.get(term)}'. ` +
              `Overwriting with '${specializedType}' from ${config.domain} config.`
            );
          }
          typeMap.set(term.toLowerCase(), specializedType);
        }
      }
    }

    // Merge verb overrides
    if (config.verbOverrides) {
      for (const [verb, overrides] of Object.entries(config.verbOverrides)) {
        // Check for conflict
        if (this.verbOverrides.has(verb)) {
          console.warn(
            `Warning: Verb '${verb}' already has overrides. ` +
            `Merging with ${config.domain} config (last wins).`
          );
        }
        this.verbOverrides.set(verb.toLowerCase(), {
          ...this.verbOverrides.get(verb.toLowerCase()),
          ...overrides
        });
      }
    }

    // Merge process root words
    if (config.processRootWords) {
      for (const [term, type] of Object.entries(config.processRootWords)) {
        if (this.processRootWords.has(term.toLowerCase()) &&
            this.processRootWords.get(term.toLowerCase()) !== type) {
          console.warn(
            `Warning: Process root word '${term}' already mapped. ` +
            `Overwriting with ${config.domain} config.`
          );
        }
        this.processRootWords.set(term.toLowerCase(), type);
      }
    }

    return true;
  }

  /**
   * Get specialized type for a term given its BFO base type
   *
   * @param {string} bfoType - BFO base type (e.g., 'bfo:BFO_0000015')
   * @param {string} term - The term to specialize (e.g., 'care')
   * @returns {string|null} Specialized type or null if no specialization found
   *
   * @example
   * loader.getTypeSpecialization('bfo:BFO_0000015', 'care')
   * // Returns: 'cco:ActOfCare' (if medical config loaded)
   */
  getTypeSpecialization(bfoType, term) {
    const typeMap = this.typeSpecializations.get(bfoType);
    if (!typeMap) {
      return null;
    }

    const normalizedTerm = term.toLowerCase().trim();

    // Direct match
    if (typeMap.has(normalizedTerm)) {
      return typeMap.get(normalizedTerm);
    }

    // Check for partial match (term contains the key)
    for (const [key, value] of typeMap) {
      if (normalizedTerm.includes(key) || key.includes(normalizedTerm)) {
        return value;
      }
    }

    return null;
  }

  /**
   * Get process type for a domain-specific root word
   *
   * @param {string} term - The term to check (e.g., 'care', 'surgery')
   * @returns {string|null} Process type or null if not found
   *
   * @example
   * loader.getProcessRootWord('care')
   * // Returns: 'cco:ActOfCare' (if medical config loaded)
   */
  getProcessRootWord(term) {
    const normalizedTerm = term.toLowerCase().trim();

    // Direct match
    if (this.processRootWords.has(normalizedTerm)) {
      return this.processRootWords.get(normalizedTerm);
    }

    // Check if term contains any root word
    for (const [rootWord, type] of this.processRootWords) {
      if (normalizedTerm.includes(rootWord)) {
        return type;
      }
    }

    return null;
  }

  /**
   * Get verb sense override based on direct object type
   *
   * @param {string} verb - The verb (e.g., 'provide')
   * @param {string} objectCategory - Object ontological category
   *   ('occurrent', 'continuant', 'gdc', or specific type)
   * @returns {string|null} Override act type or null
   *
   * @example
   * loader.getVerbOverride('provide', 'occurrent')
   * // Returns: 'cco:ActOfService'
   */
  getVerbOverride(verb, objectCategory) {
    const overrides = this.verbOverrides.get(verb.toLowerCase());
    if (!overrides) {
      return null;
    }

    // Map category to override key
    const categoryMap = {
      'occurrent': 'objectIsOccurrent',
      'process': 'objectIsOccurrent',
      'continuant': 'objectIsContinuant',
      'ic': 'objectIsContinuant',
      'gdc': 'objectIsGDC',
      'information': 'objectIsGDC'
    };

    const overrideKey = categoryMap[objectCategory.toLowerCase()] || objectCategory;

    if (overrides[overrideKey]) {
      return overrides[overrideKey];
    }

    // Fall back to default if available
    if (overrides.default) {
      return overrides.default;
    }

    return null;
  }

  /**
   * Check if any domain config is loaded
   *
   * @returns {boolean} True if at least one config is loaded
   */
  isConfigLoaded() {
    return this.configs.size > 0;
  }

  /**
   * Get list of loaded domain names
   *
   * @returns {Array<string>} Array of domain names in load order
   */
  getLoadedDomains() {
    return [...this.loadOrder];
  }

  /**
   * Get a specific loaded config by domain name
   *
   * @param {string} domain - Domain name
   * @returns {Object|null} Config object or null if not found
   */
  getConfig(domain) {
    return this.configs.get(domain) || null;
  }

  /**
   * Clear all loaded configurations
   * Returns parser to BFO-only mode
   */
  clearConfigs() {
    this.configs.clear();
    this.typeSpecializations.clear();
    this.verbOverrides.clear();
    this.processRootWords.clear();
    this.loadOrder = [];
  }

  /**
   * Get all type specializations (for debugging/introspection)
   *
   * @returns {Object} Nested object of all specializations
   */
  getAllTypeSpecializations() {
    const result = {};
    for (const [bfoType, terms] of this.typeSpecializations) {
      result[bfoType] = Object.fromEntries(terms);
    }
    return result;
  }

  /**
   * Get all process root words (for debugging/introspection)
   *
   * @returns {Object} Object of term -> type mappings
   */
  getAllProcessRootWords() {
    return Object.fromEntries(this.processRootWords);
  }
}

module.exports = DomainConfigLoader;
