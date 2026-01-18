/**
 * TTLParser.js
 *
 * Parses Turtle (TTL) RDF files into structured triple format.
 * Uses lazy-loaded N3.js library to avoid bundle bloat.
 *
 * Week 3 - January 2026
 * TagTeam v3.0 - Phase 2: TTL Parser & Ontology Pre-processing
 */

(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        // Node.js environment
        module.exports = factory();
    } else {
        // Browser environment
        root.TTLParser = factory();
    }
}(typeof self !== 'undefined' ? self : this, function() {
    'use strict';

    /**
     * TTLParser class
     * Lazy-loads N3.js library and parses Turtle RDF format
     */
    function TTLParser() {
        // Cache for N3.js library (loaded once per session)
        this._n3Cache = null;

        // Statistics
        this._stats = {
            parseCount: 0,
            tripleCount: 0,
            errorCount: 0
        };
    }

    /**
     * Parse Turtle (TTL) string into structured triples
     * @param {string} ttlString - Turtle format RDF content
     * @param {Object} [options] - Parsing options
     * @param {string} [options.baseIRI] - Base IRI for relative URIs
     * @param {boolean} [options.blankNodePrefix] - Custom blank node prefix
     * @returns {Promise<Object>} - Parsed result with triples and prefixes
     * @throws {Error} - If parsing fails
     */
    TTLParser.prototype.parse = async function(ttlString, options = {}) {
        if (!ttlString || typeof ttlString !== 'string') {
            throw new Error('TTLParser.parse: ttlString must be a non-empty string');
        }

        try {
            // Lazy-load N3.js library
            const N3 = await this._loadN3();

            // Create parser with options
            const parserOptions = {};
            if (options.baseIRI) {
                parserOptions.baseIRI = options.baseIRI;
            }
            if (options.blankNodePrefix) {
                parserOptions.blankNodePrefix = options.blankNodePrefix;
            }

            const parser = new N3.Parser(parserOptions);
            const triples = [];
            let prefixes = {};

            // Parse TTL content
            const result = await new Promise((resolve, reject) => {
                parser.parse(ttlString, (error, quad, prefixMap) => {
                    if (error) {
                        reject(new Error(`TTL parsing failed: ${error.message}`));
                    } else if (quad) {
                        // Extract quad into simplified triple format
                        triples.push({
                            subject: quad.subject.value,
                            predicate: quad.predicate.value,
                            object: quad.object.value,
                            objectType: quad.object.termType, // 'Literal', 'NamedNode', 'BlankNode'
                            objectLanguage: quad.object.language || null,
                            objectDatatype: quad.object.datatype ? quad.object.datatype.value : null
                        });
                    } else {
                        // End of parsing - prefixMap available
                        prefixes = prefixMap || {};
                        resolve({ triples, prefixes });
                    }
                });
            });

            // Update statistics
            this._stats.parseCount++;
            this._stats.tripleCount += result.triples.length;

            return result;

        } catch (error) {
            this._stats.errorCount++;

            // Enhance error message with context
            if (error.message.includes('Unexpected') ||
                error.message.includes('Expected entity') ||
                error.message.includes('Expected object')) {
                throw new Error(`Malformed TTL syntax: ${error.message}`);
            } else if (error.message.includes('undefined prefix') ||
                       error.message.includes('Undefined prefix')) {
                throw new Error(`Undefined prefix in TTL: ${error.message}`);
            } else {
                throw error;
            }
        }
    };

    /**
     * Parse Turtle file from URL (browser) or file path (Node.js)
     * @param {string} source - URL or file path
     * @param {Object} [options] - Parsing options (passed to parse())
     * @returns {Promise<Object>} - Parsed result
     */
    TTLParser.prototype.parseFile = async function(source, options = {}) {
        if (!source || typeof source !== 'string') {
            throw new Error('TTLParser.parseFile: source must be a non-empty string');
        }

        try {
            let ttlContent;

            if (typeof window !== 'undefined') {
                // Browser environment - fetch from URL
                const response = await fetch(source);
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${source}: ${response.status} ${response.statusText}`);
                }
                ttlContent = await response.text();
            } else {
                // Node.js environment - read from file system
                const fs = require('fs');
                const path = require('path');

                const resolvedPath = path.resolve(source);
                ttlContent = fs.readFileSync(resolvedPath, 'utf8');
            }

            return await this.parse(ttlContent, options);

        } catch (error) {
            throw new Error(`TTLParser.parseFile failed for ${source}: ${error.message}`);
        }
    };

    /**
     * Lazy-load N3.js library (only loads once)
     * Uses dynamic import for browser, require for Node.js
     * @returns {Promise<Object>} - N3.js library
     * @private
     */
    TTLParser.prototype._loadN3 = async function() {
        if (this._n3Cache) {
            return this._n3Cache;
        }

        try {
            if (typeof window !== 'undefined') {
                // Browser environment - load from CDN
                console.log('TTLParser: Loading N3.js from CDN...');
                this._n3Cache = await import('https://cdn.jsdelivr.net/npm/n3@1.17.1/+esm');
            } else {
                // Node.js environment - require from node_modules
                console.log('TTLParser: Loading N3.js from node_modules...');
                this._n3Cache = require('n3');
            }

            console.log('TTLParser: N3.js loaded successfully');
            return this._n3Cache;

        } catch (error) {
            throw new Error(`Failed to load N3.js library: ${error.message}. Ensure N3.js is installed: npm install n3`);
        }
    };

    /**
     * Get parser statistics
     * @returns {Object} - Statistics object
     */
    TTLParser.prototype.getStats = function() {
        return {
            parseCount: this._stats.parseCount,
            tripleCount: this._stats.tripleCount,
            errorCount: this._stats.errorCount,
            averageTriplesPerParse: this._stats.parseCount > 0
                ? Math.round(this._stats.tripleCount / this._stats.parseCount)
                : 0
        };
    };

    /**
     * Reset parser statistics
     */
    TTLParser.prototype.resetStats = function() {
        this._stats.parseCount = 0;
        this._stats.tripleCount = 0;
        this._stats.errorCount = 0;
    };

    /**
     * Clear N3.js cache (force reload on next parse)
     * Useful for testing or memory management
     */
    TTLParser.prototype.clearCache = function() {
        this._n3Cache = null;
    };

    // ========================================
    // UTILITY METHODS
    // ========================================

    /**
     * Extract all subjects from triples
     * @param {Array<Object>} triples - Triple array from parse()
     * @returns {Array<string>} - Unique subject IRIs
     */
    TTLParser.extractSubjects = function(triples) {
        const subjects = new Set();
        triples.forEach(triple => subjects.add(triple.subject));
        return Array.from(subjects);
    };

    /**
     * Filter triples by predicate
     * @param {Array<Object>} triples - Triple array from parse()
     * @param {string} predicate - Predicate IRI to filter by
     * @returns {Array<Object>} - Filtered triples
     */
    TTLParser.filterByPredicate = function(triples, predicate) {
        return triples.filter(triple => triple.predicate === predicate);
    };

    /**
     * Group triples by subject
     * @param {Array<Object>} triples - Triple array from parse()
     * @returns {Object} - Map of subject IRI to array of triples
     */
    TTLParser.groupBySubject = function(triples) {
        const grouped = {};
        triples.forEach(triple => {
            if (!grouped[triple.subject]) {
                grouped[triple.subject] = [];
            }
            grouped[triple.subject].push(triple);
        });
        return grouped;
    };

    /**
     * Resolve prefixed IRI using prefix map
     * @param {string} prefixedIri - Prefixed IRI (e.g., "rdf:type")
     * @param {Object} prefixes - Prefix map from parse()
     * @returns {string} - Full IRI
     */
    TTLParser.resolvePrefix = function(prefixedIri, prefixes) {
        if (!prefixedIri.includes(':')) {
            return prefixedIri; // Already full IRI
        }

        const [prefix, localName] = prefixedIri.split(':', 2);
        const namespace = prefixes[prefix];

        if (!namespace) {
            throw new Error(`Prefix not found: ${prefix}`);
        }

        return namespace + localName;
    };

    // ========================================
    // EXPORT
    // ========================================

    return TTLParser;
}));
