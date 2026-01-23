/**
 * EthicalProfiler.js
 *
 * Generates complete ethical profiles from scored values including:
 * - Top values identification
 * - Domain analysis
 * - Conflict detection
 * - Confidence scoring
 *
 * Part of Week 2b implementation for the Integral Ethics Engine.
 *
 * Week 2b Addition - January 2026
 */

(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.EthicalProfiler = factory();
    }
}(typeof self !== 'undefined' ? self : this, function() {
    'use strict';

    // ========================================
    // ETHICAL PROFILER CLASS
    // ========================================

    /**
     * EthicalProfiler - Generates comprehensive ethical profiles
     * @param {Object} conflictPairs - Loaded from conflict-pairs.json
     */
    function EthicalProfiler(conflictPairs) {
        this.conflictPairs = (conflictPairs && conflictPairs.conflicts) ? conflictPairs.conflicts : [];

        // Domain mapping
        this.domainNames = ['Dignity', 'Care', 'Virtue', 'Community', 'Transcendence'];

        // Configuration
        this.DEFAULT_TOP_VALUES_COUNT = 5;
        this.DOMINANT_DOMAIN_THRESHOLD = 0.1;
    }

    /**
     * Generate complete ethical profile
     * @param {Array} scoredValues - Values from ValueScorer
     * @param {Object} options - Configuration options
     * @returns {Object} - Complete ethical profile
     */
    EthicalProfiler.prototype.generateProfile = function(scoredValues, options) {
        options = options || {};
        var topValuesCount = options.topValuesCount || this.DEFAULT_TOP_VALUES_COUNT;
        var verbose = options.verbose || false;

        // Sort by salience descending (should already be sorted, but ensure)
        scoredValues.sort(function(a, b) {
            return b.salience - a.salience;
        });

        // Build profile
        var profile = {
            values: this._buildValuesArray(scoredValues),
            valueSummary: this._buildValueSummary(scoredValues),
            topValues: this._getTopValues(scoredValues, topValuesCount),
            dominantDomain: this._getDominantDomain(scoredValues),
            domainScores: this._calculateDomainScores(scoredValues),
            conflictScore: 0,
            conflicts: [],
            confidence: this._calculateConfidence(scoredValues)
        };

        // Detect conflicts
        var conflictResult = this._detectConflicts(scoredValues);
        profile.conflictScore = conflictResult.conflictScore;
        profile.conflicts = conflictResult.conflicts;

        // Add metadata if verbose
        if (verbose) {
            profile.metadata = this._buildMetadata(scoredValues);
        }

        return profile;
    };

    /**
     * Build values array in output format
     * @private
     */
    EthicalProfiler.prototype._buildValuesArray = function(scoredValues) {
        return scoredValues.map(function(value) {
            return {
                name: value.name,
                salience: value.salience,
                polarity: value.polarity,
                conflict: value.conflict || false,
                domain: this._capitalizeFirst(value.domain),
                evidence: value.evidence || [],
                source: value.source
            };
        }.bind(this));
    };

    /**
     * Build value summary object
     * @private
     */
    EthicalProfiler.prototype._buildValueSummary = function(scoredValues) {
        var byDomain = {};
        var totalSalience = 0;
        var conflictCount = 0;

        scoredValues.forEach(function(value) {
            var domain = this._capitalizeFirst(value.domain);

            if (!byDomain[domain]) {
                byDomain[domain] = 0;
            }
            byDomain[domain]++;
            totalSalience += value.salience;

            if (value.conflict) {
                conflictCount++;
            }
        }.bind(this));

        return {
            totalDetected: scoredValues.length,
            byDomain: byDomain,
            avgSalience: scoredValues.length > 0 ? parseFloat((totalSalience / scoredValues.length).toFixed(2)) : 0,
            conflicts: conflictCount
        };
    };

    /**
     * Get top N values
     * @private
     */
    EthicalProfiler.prototype._getTopValues = function(scoredValues, count) {
        return scoredValues.slice(0, count).map(function(value) {
            var topValue = {
                name: value.name,
                salience: value.salience,
                polarity: value.polarity,
                domain: this._capitalizeFirst(value.domain)
            };

            // Add breakdown if available (from ValueScorer)
            if (value.breakdown) {
                topValue.keywords = value.evidence || [];
                topValue.boostedBy = this._buildBoostedByList(value.breakdown);
            }

            return topValue;
        }.bind(this));
    };

    /**
     * Build "boostedBy" list showing which components contributed
     * @private
     */
    EthicalProfiler.prototype._buildBoostedByList = function(breakdown) {
        var boostedBy = [];

        if (breakdown.keywordScore > 0) {
            boostedBy.push('keywords:' + breakdown.keywordScore);
        }
        if (breakdown.frameBoost > 0) {
            boostedBy.push('frame:' + breakdown.frameBoost);
        }
        if (breakdown.roleBoost > 0) {
            boostedBy.push('role:' + breakdown.roleBoost);
        }

        return boostedBy;
    };

    /**
     * Calculate domain scores
     * @private
     */
    EthicalProfiler.prototype._calculateDomainScores = function(scoredValues) {
        var domainScores = {};

        // Initialize all domains to 0
        this.domainNames.forEach(function(domain) {
            domainScores[domain] = 0;
        });

        // Sum saliences by domain
        var domainCounts = {};
        scoredValues.forEach(function(value) {
            var domain = this._capitalizeFirst(value.domain);

            if (!domainScores[domain]) {
                domainScores[domain] = 0;
                domainCounts[domain] = 0;
            }

            domainScores[domain] += value.salience;
            domainCounts[domain]++;
        }.bind(this));

        // Average salience per domain
        for (var domain in domainScores) {
            if (domainCounts[domain] > 0) {
                domainScores[domain] = parseFloat((domainScores[domain] / domainCounts[domain]).toFixed(2));
            }
        }

        return domainScores;
    };

    /**
     * Determine dominant domain
     * @private
     */
    EthicalProfiler.prototype._getDominantDomain = function(scoredValues) {
        var domainScores = this._calculateDomainScores(scoredValues);

        // Find max and second max
        var maxDomain = null;
        var maxScore = -1;
        var secondMaxScore = -1;

        for (var domain in domainScores) {
            if (domainScores[domain] > maxScore) {
                secondMaxScore = maxScore;
                maxScore = domainScores[domain];
                maxDomain = domain;
            } else if (domainScores[domain] > secondMaxScore) {
                secondMaxScore = domainScores[domain];
            }
        }

        // If difference < threshold, return "Mixed"
        if (maxScore - secondMaxScore < this.DOMINANT_DOMAIN_THRESHOLD) {
            return 'Mixed';
        }

        return maxDomain;
    };

    /**
     * Detect conflicts using hybrid approach (predefined + automatic)
     * @private
     */
    EthicalProfiler.prototype._detectConflicts = function(scoredValues) {
        var conflicts = [];
        var maxTension = 0;

        // Build lookup map for quick access
        var valueMap = {};
        scoredValues.forEach(function(value) {
            valueMap[value.name] = value;
        });

        // Check predefined conflict pairs
        this.conflictPairs.forEach(function(pair) {
            var value1 = valueMap[pair.value1];
            var value2 = valueMap[pair.value2];

            // Both values must be detected and significant
            if (value1 && value2 && value1.salience >= 0.6 && value2.salience >= 0.6) {
                var tension = this._calculateTension(value1, value2, pair.severity || 0.7);

                if (tension > 0.4) { // Threshold to avoid noise
                    conflicts.push({
                        value1: value1.name,
                        value2: value2.name,
                        score1: value1.salience,
                        score2: value2.salience,
                        polarity1: value1.polarity,
                        polarity2: value2.polarity,
                        tension: parseFloat(tension.toFixed(2)),
                        description: pair.description || '',
                        source: 'predefined'
                    });

                    if (tension > maxTension) {
                        maxTension = tension;
                    }
                }
            }
        }.bind(this));

        // Automatic conflict detection (both values > 0.6, different polarities)
        for (var i = 0; i < scoredValues.length; i++) {
            for (var j = i + 1; j < scoredValues.length; j++) {
                var v1 = scoredValues[i];
                var v2 = scoredValues[j];

                // Check if both significant and polarities differ
                if (v1.salience >= 0.6 && v2.salience >= 0.6 && v1.polarity !== v2.polarity && v1.polarity !== 0 && v2.polarity !== 0) {
                    // Check if not already in predefined conflicts
                    var alreadyDetected = conflicts.some(function(c) {
                        return (c.value1 === v1.name && c.value2 === v2.name) ||
                               (c.value1 === v2.name && c.value2 === v1.name);
                    });

                    if (!alreadyDetected) {
                        var tension = this._calculateTension(v1, v2, 0.5); // Medium severity for auto-detected

                        if (tension > 0.4) {
                            conflicts.push({
                                value1: v1.name,
                                value2: v2.name,
                                score1: v1.salience,
                                score2: v2.salience,
                                polarity1: v1.polarity,
                                polarity2: v2.polarity,
                                tension: parseFloat(tension.toFixed(2)),
                                description: 'Auto-detected: opposing polarities with high salience',
                                source: 'detected'
                            });

                            if (tension > maxTension) {
                                maxTension = tension;
                            }
                        }
                    }
                }
            }
        }

        return {
            conflictScore: parseFloat(maxTension.toFixed(2)),
            conflicts: conflicts
        };
    };

    /**
     * Calculate tension between two values
     * @private
     * @param {Object} value1 - First value
     * @param {Object} value2 - Second value
     * @param {number} severity - Severity rating (0.0-1.0)
     * @returns {number} - Tension score
     */
    EthicalProfiler.prototype._calculateTension = function(value1, value2, severity) {
        // tension = min(score1, score2) * severity * conflict_factor
        var minScore = Math.min(value1.salience, value2.salience);

        // Conflict factor based on polarities
        var conflictFactor = 1.0;
        if (value1.polarity === value2.polarity) {
            conflictFactor = 0.5; // Same polarity = less tension
        } else if (value1.polarity === 0 || value2.polarity === 0) {
            conflictFactor = 0.5; // One neutral = less tension
        }
        // else: opposing polarities = 1.0 (maximum tension)

        return minScore * severity * conflictFactor;
    };

    /**
     * Calculate confidence score
     * @private
     */
    EthicalProfiler.prototype._calculateConfidence = function(scoredValues) {
        if (scoredValues.length === 0) {
            return 0;
        }

        // Factors affecting confidence:
        // 1. Number of values detected (more = higher confidence)
        // 2. Average salience (higher = more confident)
        // 3. Evidence quality (keyword vs. entailment)

        var valueCountFactor = Math.min(scoredValues.length / 10, 1.0); // Cap at 10 values
        var avgSalience = scoredValues.reduce(function(sum, v) {
            return sum + v.salience;
        }, 0) / scoredValues.length;

        var keywordCount = scoredValues.filter(function(v) {
            return v.source === 'keyword';
        }).length;
        var evidenceFactor = scoredValues.length > 0 ? keywordCount / scoredValues.length : 0;

        var confidence = (valueCountFactor * 0.3) + (avgSalience * 0.5) + (evidenceFactor * 0.2);

        return parseFloat(Math.min(confidence, 1.0).toFixed(2));
    };

    /**
     * Build metadata object for verbose mode
     * @private
     */
    EthicalProfiler.prototype._buildMetadata = function(scoredValues) {
        var totalKeywordMatches = 0;
        var keywordValues = 0;
        var frameBoostCount = 0;
        var roleBoostCount = 0;

        scoredValues.forEach(function(value) {
            if (value.source === 'keyword') {
                keywordValues++;
                totalKeywordMatches += value.evidence.length;
            }
            if (value.breakdown) {
                if (value.breakdown.frameBoost > 0) frameBoostCount++;
                if (value.breakdown.roleBoost > 0) roleBoostCount++;
            }
        });

        var avgSalience = scoredValues.length > 0 ?
            scoredValues.reduce(function(sum, v) { return sum + v.salience; }, 0) / scoredValues.length : 0;

        return {
            totalKeywordMatches: totalKeywordMatches,
            valuesDetected: scoredValues.length,
            keywordBasedValues: keywordValues,
            entailedValues: scoredValues.length - keywordValues,
            frameBoostsApplied: frameBoostCount,
            roleBoostsApplied: roleBoostCount,
            averageScore: parseFloat(avgSalience.toFixed(2))
        };
    };

    /**
     * Capitalize first letter of string
     * @private
     */
    EthicalProfiler.prototype._capitalizeFirst = function(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    // ========================================
    // EXPORT
    // ========================================

    return EthicalProfiler;
}));
