/**
 * ValueMatcher.js
 *
 * Detects ethical values in text using keyword matching and polarity detection.
 * Part of Week 2b implementation for the Integral Ethics Engine.
 *
 * Week 2b Addition - January 2026
 */

(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        // Node.js
        var PatternMatcher = require('../core/PatternMatcher');
        module.exports = factory(PatternMatcher);
    } else {
        // Browser
        root.ValueMatcher = factory(root.PatternMatcher);
    }
}(typeof self !== 'undefined' ? self : this, function(PatternMatcher) {
    'use strict';

    // ========================================
    // VALUE MATCHER CLASS
    // ========================================

    /**
     * ValueMatcher - Detects ethical values in text
     * @param {Object} valueDefinitions - Loaded from value-definitions-comprehensive.json
     */
    function ValueMatcher(valueDefinitions) {
        if (!valueDefinitions || !valueDefinitions.values) {
            throw new Error('ValueMatcher requires value definitions with "values" array');
        }

        this.valueDefinitions = valueDefinitions.values;
        this.patternMatcher = new PatternMatcher();

        // Pre-compile value lookup by name for quick access
        this.valueByName = {};
        this.valueDefinitions.forEach(function(valueDef) {
            this.valueByName[valueDef.name] = valueDef;
        }.bind(this));
    }

    /**
     * Match values in text and return all detected values with metadata
     * @param {string} text - Input text to analyze
     * @returns {Array} - Array of detected values with salience, polarity, evidence
     */
    ValueMatcher.prototype.matchValues = function(text) {
        var detectedValues = [];

        this.valueDefinitions.forEach(function(valueDef) {
            var result = this._matchSingleValue(text, valueDef);

            if (result.keywordCount > 0) {
                detectedValues.push({
                    name: valueDef.name,
                    domain: valueDef.domain,
                    keywordCount: result.keywordCount,
                    polarity: result.polarity,
                    evidence: result.evidence,
                    source: 'keyword'
                });
            }
        }.bind(this));

        return detectedValues;
    };

    /**
     * Match a single value against text
     * @private
     * @param {string} text - Input text
     * @param {Object} valueDef - Value definition object
     * @returns {Object} - Match result with keywordCount, polarity, evidence
     */
    ValueMatcher.prototype._matchSingleValue = function(text, valueDef) {
        var lowerText = text.toLowerCase();
        var keywordCount = 0;
        var evidence = [];
        var upholdingCount = 0;
        var violatingCount = 0;

        // Step 1: Count keyword matches from semanticMarkers
        var semanticMarkers = valueDef.semanticMarkers || [];
        semanticMarkers.forEach(function(marker) {
            var lowerMarker = marker.toLowerCase();
            var regex = new RegExp('\\b' + this._escapeRegex(lowerMarker) + '\\b', 'gi');
            var matches = lowerText.match(regex);

            if (matches) {
                keywordCount += matches.length;
                // Collect evidence (deduplicate)
                if (evidence.indexOf(marker) === -1) {
                    evidence.push(marker);
                }
            }
        }.bind(this));

        // Step 2: Determine polarity using polarityIndicators
        if (valueDef.polarityIndicators) {
            // Week 3 Enhancement: Use BALANCED strategy for flexible matching
            var matchOptions = {
                lemmatize: true,
                caseSensitive: false,
                partialMatch: true,
                threshold: 0.8
            };

            // Check upholding patterns
            var upholdingPatterns = valueDef.polarityIndicators.upholding || [];
            upholdingPatterns.forEach(function(pattern) {
                if (this.patternMatcher.containsAny(text, [pattern], matchOptions)) {
                    upholdingCount++;
                }
            }.bind(this));

            // Check violating patterns
            var violatingPatterns = valueDef.polarityIndicators.violating || [];
            violatingPatterns.forEach(function(pattern) {
                if (this.patternMatcher.containsAny(text, [pattern], matchOptions)) {
                    violatingCount++;
                }
            }.bind(this));
        }

        // Step 3: Determine final polarity
        var polarity = this._determinePolarity(upholdingCount, violatingCount);

        return {
            keywordCount: keywordCount,
            polarity: polarity,
            evidence: evidence,
            upholdingCount: upholdingCount,
            violatingCount: violatingCount
        };
    };

    /**
     * Determine polarity based on upholding and violating evidence
     * @private
     * @param {number} upholdingCount - Number of upholding patterns matched
     * @param {number} violatingCount - Number of violating patterns matched
     * @returns {number} - Polarity: +1 (upholding), -1 (violating), 0 (neutral/conflicted)
     */
    ValueMatcher.prototype._determinePolarity = function(upholdingCount, violatingCount) {
        // Binary polarity detection (as approved by IEE)

        // If both upholding and violating evidence, return 0 (conflicted)
        if (upholdingCount > 0 && violatingCount > 0) {
            return 0;
        }

        // If only violating evidence
        if (violatingCount > 0) {
            return -1;
        }

        // If only upholding evidence
        if (upholdingCount > 0) {
            return +1;
        }

        // No polarity evidence, return 0 (neutral)
        return 0;
    };

    /**
     * Check if polarity represents a genuine conflict
     * @param {number} upholdingCount - Upholding pattern matches
     * @param {number} violatingCount - Violating pattern matches
     * @returns {boolean} - True if both upholding AND violating evidence present
     */
    ValueMatcher.prototype.isConflicted = function(upholdingCount, violatingCount) {
        return upholdingCount > 0 && violatingCount > 0;
    };

    /**
     * Escape regex special characters
     * @private
     */
    ValueMatcher.prototype._escapeRegex = function(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    /**
     * Get value definition by name
     * @param {string} valueName - Name of the value
     * @returns {Object|null} - Value definition or null if not found
     */
    ValueMatcher.prototype.getValueDefinition = function(valueName) {
        return this.valueByName[valueName] || null;
    };

    /**
     * Get all value names
     * @returns {Array<string>} - Array of all value names
     */
    ValueMatcher.prototype.getAllValueNames = function() {
        return this.valueDefinitions.map(function(v) { return v.name; });
    };

    // ========================================
    // EXPORT
    // ========================================

    return ValueMatcher;
}));
