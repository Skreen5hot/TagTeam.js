/**
 * ValueScorer.js
 *
 * Calculates salience scores for detected values by applying frame and role boosts.
 * Part of Week 2b implementation for the Integral Ethics Engine.
 *
 * Implements the approved salience formula:
 *   salience = 0.0 (base)
 *            + min(keywordCount * 0.3, 0.6)  // keyword score
 *            + frameBoost (0.0-0.3)
 *            + roleBoost (0.0-0.2)
 *            → clamped to [0.0, 1.0]
 *
 * Week 2b Addition - January 2026
 */

(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.ValueScorer = factory();
    }
}(typeof self !== 'undefined' ? self : this, function() {
    'use strict';

    // ========================================
    // VALUE SCORER CLASS
    // ========================================

    /**
     * ValueScorer - Calculates salience scores with frame/role boosts
     * @param {Object} frameValueBoosts - Loaded from frame-value-boosts.json
     */
    function ValueScorer(frameValueBoosts) {
        if (!frameValueBoosts) {
            throw new Error('ValueScorer requires frameValueBoosts configuration');
        }

        this.frameBoosts = frameValueBoosts.frameValueBoosts || {};
        this.roleBoosts = frameValueBoosts.roleValueBoosts || {};

        // Constants for salience calculation
        this.KEYWORD_MULTIPLIER = 0.3;
        this.KEYWORD_CAP = 0.6;
        this.DETECTION_THRESHOLD = 0.3;
    }

    /**
     * Calculate salience for a detected value
     * @param {Object} detectedValue - Value from ValueMatcher with keywordCount
     * @param {string} semanticFrame - Current semantic frame (e.g., "Deciding")
     * @param {Array<string>} roles - Array of roles (e.g., ["doctor", "patient"])
     * @returns {Object} - Scored value with salience, breakdown, and source
     */
    ValueScorer.prototype.calculateSalience = function(detectedValue, semanticFrame, roles) {
        var valueName = detectedValue.name;
        var keywordCount = detectedValue.keywordCount || 0;

        // Step 1: Keyword score (0.0 to 0.6)
        var keywordScore = Math.min(keywordCount * this.KEYWORD_MULTIPLIER, this.KEYWORD_CAP);

        // Step 2: Frame boost (0.0 to 0.3)
        var frameBoost = this._getFrameBoost(semanticFrame, valueName);

        // Step 3: Role boost (0.0 to 0.2)
        var roleBoost = this._getRoleBoost(roles, valueName);

        // Step 4: Calculate final salience
        var salience = keywordScore + frameBoost + roleBoost;
        salience = Math.min(Math.max(salience, 0.0), 1.0); // Clamp to [0.0, 1.0]

        return {
            name: valueName,
            domain: detectedValue.domain,
            salience: parseFloat(salience.toFixed(2)), // Round to 2 decimals
            polarity: detectedValue.polarity,
            evidence: detectedValue.evidence,
            source: detectedValue.source,
            breakdown: {
                keywordScore: parseFloat(keywordScore.toFixed(2)),
                frameBoost: parseFloat(frameBoost.toFixed(2)),
                roleBoost: parseFloat(roleBoost.toFixed(2)),
                total: parseFloat(salience.toFixed(2))
            }
        };
    };

    /**
     * Score all detected values and add entailed values
     * @param {Array} detectedValues - Array of values from ValueMatcher
     * @param {string} semanticFrame - Current semantic frame
     * @param {Array<string>} roles - Array of roles
     * @param {Array} allValueDefinitions - All 50 value definitions (for entailment)
     * @returns {Array} - Array of scored values above threshold
     */
    ValueScorer.prototype.scoreValues = function(detectedValues, semanticFrame, roles, allValueDefinitions) {
        var scoredValues = [];
        var processedValueNames = {};

        // Score all keyword-detected values
        detectedValues.forEach(function(detectedValue) {
            var scored = this.calculateSalience(detectedValue, semanticFrame, roles);

            if (scored.salience >= this.DETECTION_THRESHOLD) {
                scoredValues.push(scored);
                processedValueNames[scored.name] = true;
            }
        }.bind(this));

        // Add entailed values (values boosted by frame/role but not in keywords)
        this._addEntailedValues(scoredValues, processedValueNames, semanticFrame, roles, allValueDefinitions);

        // Sort by salience descending
        scoredValues.sort(function(a, b) {
            return b.salience - a.salience;
        });

        return scoredValues;
    };

    /**
     * Add entailed values - values implied by frame/role but not keyword-detected
     * @private
     */
    ValueScorer.prototype._addEntailedValues = function(scoredValues, processedValueNames, semanticFrame, roles, allValueDefinitions) {
        // Check frame boosts for values not yet processed
        if (this.frameBoosts[semanticFrame]) {
            var frameValueBoosts = this.frameBoosts[semanticFrame].boosts || {};

            for (var valueName in frameValueBoosts) {
                if (!processedValueNames[valueName]) {
                    var entailedValue = this._createEntailedValue(valueName, semanticFrame, roles, allValueDefinitions);

                    if (entailedValue && entailedValue.salience >= this.DETECTION_THRESHOLD) {
                        scoredValues.push(entailedValue);
                        processedValueNames[valueName] = true;
                    }
                }
            }
        }

        // Check role boosts for values not yet processed
        roles.forEach(function(role) {
            if (this.roleBoosts[role]) {
                var roleValueBoosts = this.roleBoosts[role].boosts || {};

                for (var valueName in roleValueBoosts) {
                    if (!processedValueNames[valueName]) {
                        var entailedValue = this._createEntailedValue(valueName, semanticFrame, roles, allValueDefinitions);

                        if (entailedValue && entailedValue.salience >= this.DETECTION_THRESHOLD) {
                            scoredValues.push(entailedValue);
                            processedValueNames[valueName] = true;
                        }
                    }
                }
            }
        }.bind(this));
    };

    /**
     * Create an entailed value (boosted by frame/role but no keywords)
     * @private
     */
    ValueScorer.prototype._createEntailedValue = function(valueName, semanticFrame, roles, allValueDefinitions) {
        // Find value definition
        var valueDef = null;
        for (var i = 0; i < allValueDefinitions.length; i++) {
            if (allValueDefinitions[i].name === valueName) {
                valueDef = allValueDefinitions[i];
                break;
            }
        }

        if (!valueDef) {
            return null;
        }

        // Calculate salience (no keyword score, only boosts)
        var frameBoost = this._getFrameBoost(semanticFrame, valueName);
        var roleBoost = this._getRoleBoost(roles, valueName);
        var salience = Math.min(frameBoost + roleBoost, 1.0);

        if (salience < this.DETECTION_THRESHOLD) {
            return null;
        }

        return {
            name: valueName,
            domain: valueDef.domain,
            salience: parseFloat(salience.toFixed(2)),
            polarity: +1, // Default to upholding for entailed values (conservative assumption)
            evidence: [],
            source: 'entailment',
            breakdown: {
                keywordScore: 0.0,
                frameBoost: parseFloat(frameBoost.toFixed(2)),
                roleBoost: parseFloat(roleBoost.toFixed(2)),
                total: parseFloat(salience.toFixed(2))
            }
        };
    };

    /**
     * Get frame boost for a value
     * @private
     * @param {string} frame - Semantic frame name
     * @param {string} valueName - Value name
     * @returns {number} - Boost amount (0.0-0.3)
     */
    ValueScorer.prototype._getFrameBoost = function(frame, valueName) {
        if (!frame || !this.frameBoosts[frame]) {
            return 0.0;
        }

        var boosts = this.frameBoosts[frame].boosts || {};
        return boosts[valueName] || 0.0;
    };

    /**
     * Get role boost for a value (maximum across all roles)
     * @private
     * @param {Array<string>} roles - Array of role names
     * @param {string} valueName - Value name
     * @returns {number} - Maximum boost amount (0.0-0.2)
     */
    ValueScorer.prototype._getRoleBoost = function(roles, valueName) {
        if (!roles || roles.length === 0) {
            return 0.0;
        }

        var maxBoost = 0.0;

        roles.forEach(function(role) {
            if (this.roleBoosts[role]) {
                var boosts = this.roleBoosts[role].boosts || {};
                var boost = boosts[valueName] || 0.0;

                // Take maximum boost (avoid double-counting)
                if (boost > maxBoost) {
                    maxBoost = boost;
                }
            }
        }.bind(this));

        // Cap role boost at 0.2 as per specification
        return Math.min(maxBoost, 0.2);
    };

    /**
     * Get detection threshold
     * @returns {number} - Minimum salience threshold (0.3)
     */
    ValueScorer.prototype.getThreshold = function() {
        return this.DETECTION_THRESHOLD;
    };

    // ========================================
    // EXPORT
    // ========================================

    return ValueScorer;
}));
