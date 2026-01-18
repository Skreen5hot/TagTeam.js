/**
 * PatternMatcher.js
 *
 * Utility module for keyword pattern matching, negation handling,
 * intensifiers, and hedges. Used by ContextAnalyzer and ValueMatcher.
 *
 * Week 2a Addition - January 2026
 * Week 3 Enhancement - Added NLP support for flexible pattern matching
 */

(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        // Node.js environment
        const nlp = require('compromise');
        module.exports = factory(nlp);
    } else {
        // Browser environment - expect compromise to be loaded globally
        root.PatternMatcher = factory(root.nlp);
    }
}(typeof self !== 'undefined' ? self : this, function(nlp) {
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

        // Store reference to NLP library
        this.nlp = nlp;

        // Cache for lemmatized text (per-parse session)
        this._lemmaCache = new Map();
    }

    /**
     * Check if text contains any keywords from a list
     * @param {string} text - Input text
     * @param {Array<string>} keywords - Keywords to search for
     * @param {Object} [options] - Matching options
     * @param {boolean} [options.lemmatize=true] - Lemmatize text/patterns
     * @param {boolean} [options.caseSensitive=false] - Case-sensitive matching
     * @param {boolean} [options.partialMatch=true] - Allow partial phrase matches
     * @param {number} [options.threshold=0.8] - Match threshold (0-1)
     * @returns {boolean} - True if any keyword found
     */
    PatternMatcher.prototype.containsAny = function(text, keywords, options) {
        // If no options provided, use legacy exact matching for backward compatibility
        if (!options) {
            const lowerText = text.toLowerCase();
            return keywords.some(keyword => {
                const lowerKeyword = keyword.toLowerCase();
                // Use word boundary regex for whole-word matching
                const regex = new RegExp('\\b' + this._escapeRegex(lowerKeyword) + '\\b', 'i');
                return regex.test(lowerText);
            });
        }

        // New enhanced matching with options
        const config = {
            lemmatize: options.lemmatize !== false,
            caseSensitive: options.caseSensitive || false,
            partialMatch: options.partialMatch !== false,
            threshold: options.threshold || 0.8
        };

        // Preprocess text once
        const processedText = this._preprocessText(text, config);

        // Check each pattern
        for (const pattern of keywords) {
            const processedPattern = this._preprocessText(pattern, config);

            if (this._matchPhrase(processedText, processedPattern, config)) {
                return true;
            }
        }

        return false;
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
    // NLP-POWERED MATCHING METHODS (Week 3)
    // ========================================

    /**
     * Preprocess text for matching
     * Uses Compromise.js for lemmatization and normalization
     * @param {string} text - Text to preprocess
     * @param {Object} config - Configuration options
     * @returns {string} - Preprocessed text
     */
    PatternMatcher.prototype._preprocessText = function(text, config) {
        // Check cache first
        const cacheKey = text + JSON.stringify(config);
        if (this._lemmaCache.has(cacheKey)) {
            return this._lemmaCache.get(cacheKey);
        }

        let processed = text;

        // Apply case normalization
        if (!config.caseSensitive) {
            processed = processed.toLowerCase();
        }

        // Apply lemmatization if NLP is available and requested
        if (config.lemmatize && this.nlp) {
            try {
                const doc = this.nlp(processed);

                // Convert verbs to infinitive and nouns to singular
                // Compromise.js modifies the document in place
                doc.verbs().toInfinitive();
                doc.nouns().toSingular();

                // Get the lemmatized text
                processed = doc.text();
            } catch (e) {
                // If NLP fails, fall back to original text
                console.warn('NLP processing failed, using original text:', e.message);
            }
        }

        // Remove possessives ('s, s')
        processed = processed.replace(/(\w+)'s?\b/g, '$1');

        // Normalize whitespace
        processed = processed.replace(/\s+/g, ' ').trim();

        // Cache the result
        this._lemmaCache.set(cacheKey, processed);

        return processed;
    };

    /**
     * Match phrases with flexible word order
     * @param {string} text - Preprocessed text
     * @param {string} pattern - Preprocessed pattern
     * @param {Object} config - Configuration options
     * @returns {boolean} - True if pattern matches
     */
    PatternMatcher.prototype._matchPhrase = function(text, pattern, config) {
        // 1. Exact substring match (fastest)
        if (text.includes(pattern)) {
            return true;
        }

        // 2. Tokenize both text and pattern
        const textTokens = text.split(/\s+/);
        const patternTokens = pattern.split(/\s+/);

        // 3. Check if all pattern tokens exist in text (partial match)
        if (config.partialMatch) {
            const matchedTokens = patternTokens.filter(patternToken =>
                textTokens.some(textToken =>
                    this._tokenSimilarity(textToken, patternToken) >= config.threshold
                )
            );

            // Calculate match ratio
            const matchRatio = matchedTokens.length / patternTokens.length;
            return matchRatio >= config.threshold;
        }

        // 4. Sequential phrase matching (ordered)
        return this._sequentialMatch(textTokens, patternTokens, config);
    };

    /**
     * Sequential phrase matching (words must appear in order)
     * @param {Array<string>} textTokens - Text tokens
     * @param {Array<string>} patternTokens - Pattern tokens
     * @param {Object} config - Configuration options
     * @returns {boolean} - True if pattern matches sequentially
     */
    PatternMatcher.prototype._sequentialMatch = function(textTokens, patternTokens, config) {
        let patternIndex = 0;

        for (let i = 0; i < textTokens.length && patternIndex < patternTokens.length; i++) {
            if (this._tokenSimilarity(textTokens[i], patternTokens[patternIndex]) >= config.threshold) {
                patternIndex++;
            }
        }

        return patternIndex === patternTokens.length;
    };

    /**
     * Calculate similarity between two tokens
     * Uses Levenshtein distance for fuzzy matching
     * @param {string} token1 - First token
     * @param {string} token2 - Second token
     * @returns {number} - Similarity score (0.0-1.0)
     */
    PatternMatcher.prototype._tokenSimilarity = function(token1, token2) {
        if (token1 === token2) return 1.0;

        // Levenshtein distance
        const distance = this._levenshteinDistance(token1, token2);
        const maxLength = Math.max(token1.length, token2.length);

        return 1 - (distance / maxLength);
    };

    /**
     * Calculate Levenshtein distance between two strings
     * @param {string} a - First string
     * @param {string} b - Second string
     * @returns {number} - Edit distance
     */
    PatternMatcher.prototype._levenshteinDistance = function(a, b) {
        const matrix = [];

        // Initialize first column
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        // Initialize first row
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        // Fill in the rest of the matrix
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    };

    /**
     * Clear the lemmatization cache
     * Should be called between parse sessions to free memory
     */
    PatternMatcher.prototype.clearCache = function() {
        this._lemmaCache.clear();
    };

    // ========================================
    // EXPORT
    // ========================================

    return PatternMatcher;
}));
