/**
 * MatchingStrategies.js
 *
 * Predefined pattern matching strategies for different use cases.
 * Strategies control how PatternMatcher handles lemmatization, case sensitivity,
 * partial matches, and similarity thresholds.
 *
 * Week 3 Addition - January 2026
 */

(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.MatchingStrategies = factory();
    }
}(typeof self !== 'undefined' ? self : this, function() {
    'use strict';

    /**
     * Matching strategy presets
     *
     * Each strategy defines how pattern matching should behave:
     * - lemmatize: Convert words to base form (e.g., "obtaining" -> "obtain")
     * - caseSensitive: Whether to match case exactly
     * - partialMatch: Allow words to appear in any order
     * - threshold: Similarity threshold (0.0-1.0) for fuzzy matching
     */
    const MatchingStrategies = {
        /**
         * STRICT: Exact matching only
         * Use when precision is critical (e.g., legal terms, proper nouns)
         */
        STRICT: {
            lemmatize: false,
            caseSensitive: true,
            partialMatch: false,
            threshold: 1.0
        },

        /**
         * BALANCED: Recommended for most use cases
         * Handles inflections and possessives while maintaining accuracy
         */
        BALANCED: {
            lemmatize: true,
            caseSensitive: false,
            partialMatch: true,
            threshold: 0.8
        },

        /**
         * FUZZY: Maximum flexibility
         * Use for exploratory analysis or when variation is expected
         */
        FUZZY: {
            lemmatize: true,
            caseSensitive: false,
            partialMatch: true,
            threshold: 0.6
        },

        /**
         * MEDICAL: Healthcare-specific matching
         * Higher precision for medical terminology
         */
        MEDICAL: {
            lemmatize: true,
            caseSensitive: false,
            partialMatch: true,
            threshold: 0.85
        },

        /**
         * LEGAL: Legal document matching
         * Precise matching with minimal lemmatization
         */
        LEGAL: {
            lemmatize: false,
            caseSensitive: true,
            partialMatch: false,
            threshold: 0.95
        },

        /**
         * ETHICS: Ethics and values matching (default for TagTeam)
         * Balanced approach suitable for ethical reasoning
         */
        ETHICS: {
            lemmatize: true,
            caseSensitive: false,
            partialMatch: true,
            threshold: 0.8
        }
    };

    return MatchingStrategies;
}));
