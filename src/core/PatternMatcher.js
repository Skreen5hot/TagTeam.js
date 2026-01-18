/**
 * PatternMatcher.js
 *
 * Utility module for keyword pattern matching, negation handling,
 * intensifiers, and hedges. Used by ContextAnalyzer and ValueMatcher.
 *
 * Week 2a Addition - January 2026
 */

(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.PatternMatcher = factory();
    }
}(typeof self !== 'undefined' ? self : this, function() {
    'use strict';

    // ========================================
    // NEGATION PATTERNS
    // ========================================

    const NEGATION_PATTERNS = [
        'not', 'no', 'without', 'lack of', "isn't", "doesn't", "won't",
        "can't", "couldn't", "shouldn't", "wouldn't", "haven't", "hasn't",
        'never', 'none', 'neither', 'nor', 'hardly', 'barely', 'scarcely',
        'seldom', 'rarely'
    ];

    // ========================================
    // INTENSIFIER PATTERNS
    // ========================================

    const INTENSIFIER_PATTERNS = [
        'very', 'extremely', 'highly', 'completely', 'totally', 'absolutely',
        'utterly', 'thoroughly', 'exceptionally', 'incredibly', 'remarkably',
        'especially', 'particularly', 'profoundly', 'intensely', 'severely',
        'critically'
    ];

    const INTENSIFIER_BOOST = 0.15;

    // ========================================
    // HEDGE PATTERNS
    // ========================================

    const HEDGE_PATTERNS = [
        'somewhat', 'slightly', 'maybe', 'perhaps', 'possibly', 'probably',
        'might', 'might be', 'could be', 'may be', 'unclear', 'uncertain',
        'questionable', 'debatable', 'arguably'
    ];

    const HEDGE_REDUCTION = 0.15;

    // ========================================
    // PATTERN MATCHER CLASS
    // ========================================

    function PatternMatcher() {
        // Initialize with default patterns
        this.negationPatterns = NEGATION_PATTERNS;
        this.intensifierPatterns = INTENSIFIER_PATTERNS;
        this.hedgePatterns = HEDGE_PATTERNS;
    }

    /**
     * Check if text contains any keywords from a list
     * @param {string} text - Input text
     * @param {Array<string>} keywords - Keywords to search for
     * @returns {boolean} - True if any keyword found
     */
    PatternMatcher.prototype.containsAny = function(text, keywords) {
        const lowerText = text.toLowerCase();
        return keywords.some(keyword => {
            const lowerKeyword = keyword.toLowerCase();
            // Use word boundary regex for whole-word matching
            const regex = new RegExp('\\b' + this._escapeRegex(lowerKeyword) + '\\b', 'i');
            return regex.test(lowerText);
        });
    };

    /**
     * Count how many keywords from list appear in text
     * @param {string} text - Input text
     * @param {Array<string>} keywords - Keywords to count
     * @returns {number} - Count of matching keywords
     */
    PatternMatcher.prototype.countKeywords = function(text, keywords) {
        const lowerText = text.toLowerCase();
        let count = 0;

        keywords.forEach(keyword => {
            const lowerKeyword = keyword.toLowerCase();
            const regex = new RegExp('\\b' + this._escapeRegex(lowerKeyword) + '\\b', 'gi');
            const matches = lowerText.match(regex);
            if (matches) {
                count += matches.length;
            }
        });

        return count;
    };

    /**
     * Check if keyword appears with negation nearby
     * @param {string} text - Input text
     * @param {string} keyword - Keyword to check
     * @returns {boolean} - True if negated
     */
    PatternMatcher.prototype.isNegated = function(text, keyword) {
        const lowerText = text.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();

        // Check for negation within 3 words before keyword
        for (const negation of this.negationPatterns) {
            const pattern = new RegExp(
                '\\b' + this._escapeRegex(negation) +
                '\\s+\\w+\\s+\\w+\\s+\\w*' +
                this._escapeRegex(lowerKeyword),
                'i'
            );
            if (pattern.test(lowerText)) {
                return true;
            }

            // Also check for direct negation (within 1 word)
            const directPattern = new RegExp(
                '\\b' + this._escapeRegex(negation) +
                '\\s+' +
                this._escapeRegex(lowerKeyword),
                'i'
            );
            if (directPattern.test(lowerText)) {
                return true;
            }
        }

        return false;
    };

    /**
     * Apply negation, intensifiers, and hedges to a base score
     * @param {string} text - Input text
     * @param {string} keyword - Keyword that triggered the score
     * @param {number} baseScore - Base score (0.0-1.0)
     * @returns {number} - Adjusted score (0.0-1.0)
     */
    PatternMatcher.prototype.adjustScore = function(text, keyword, baseScore) {
        let score = baseScore;

        // Check for negation
        if (this.isNegated(text, keyword)) {
            score = 1.0 - score; // Invert
        }

        // Check for intensifiers
        if (this.hasIntensifier(text, keyword)) {
            score = Math.min(score + INTENSIFIER_BOOST, 1.0);
        }

        // Check for hedges
        if (this.hasHedge(text, keyword)) {
            score = Math.max(score - HEDGE_REDUCTION, 0.0);
        }

        return score;
    };

    /**
     * Check if keyword appears with intensifier nearby
     * @param {string} text - Input text
     * @param {string} keyword - Keyword to check
     * @returns {boolean} - True if intensified
     */
    PatternMatcher.prototype.hasIntensifier = function(text, keyword) {
        const lowerText = text.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();

        for (const intensifier of this.intensifierPatterns) {
            // Check within 2 words before keyword
            const pattern = new RegExp(
                '\\b' + this._escapeRegex(intensifier) +
                '\\s+\\w*\\s*' +
                this._escapeRegex(lowerKeyword),
                'i'
            );
            if (pattern.test(lowerText)) {
                return true;
            }
        }

        return false;
    };

    /**
     * Check if keyword appears with hedge nearby
     * @param {string} text - Input text
     * @param {string} keyword - Keyword to check
     * @returns {boolean} - True if hedged
     */
    PatternMatcher.prototype.hasHedge = function(text, keyword) {
        const lowerText = text.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();

        for (const hedge of this.hedgePatterns) {
            // Check within 2 words before keyword
            const pattern = new RegExp(
                '\\b' + this._escapeRegex(hedge) +
                '\\s+\\w*\\s*' +
                this._escapeRegex(lowerKeyword),
                'i'
            );
            if (pattern.test(lowerText)) {
                return true;
            }
        }

        return false;
    };

    /**
     * Escape special regex characters in a string
     * @param {string} str - String to escape
     * @returns {string} - Escaped string
     */
    PatternMatcher.prototype._escapeRegex = function(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    /**
     * Get the maximum score from keyword matches
     * @param {string} text - Input text
     * @param {Object} keywordSets - Object with keyword arrays and scores
     *                               e.g., {high: ['emergency'], medium: ['urgent']}
     * @param {Object} scoreMap - Map of set names to scores
     *                            e.g., {high: 0.9, medium: 0.6, low: 0.2}
     * @param {number} defaultScore - Default score if no matches
     * @returns {number} - Maximum score (0.0-1.0)
     */
    PatternMatcher.prototype.getMaxScore = function(text, keywordSets, scoreMap, defaultScore) {
        let maxScore = null; // Start with null to detect if any match found
        let foundMatch = false;

        for (const setName in keywordSets) {
            if (keywordSets.hasOwnProperty(setName) && scoreMap[setName] !== undefined) {
                const keywords = keywordSets[setName];
                const baseScore = scoreMap[setName];

                for (const keyword of keywords) {
                    if (this.containsAny(text, [keyword])) {
                        // Apply adjustments (negation, intensifiers, hedges)
                        const adjustedScore = this.adjustScore(text, keyword, baseScore);

                        if (!foundMatch) {
                            maxScore = adjustedScore;
                            foundMatch = true;
                        } else {
                            maxScore = Math.max(maxScore, adjustedScore);
                        }
                    }
                }
            }
        }

        // Return default only if no matches found
        return foundMatch ? maxScore : (defaultScore || 0.5);
    };

    // ========================================
    // EXPORT
    // ========================================

    return PatternMatcher;
}));
