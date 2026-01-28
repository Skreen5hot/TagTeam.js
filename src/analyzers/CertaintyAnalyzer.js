/**
 * CertaintyAnalyzer.js
 *
 * Phase 7.2: Detects certainty markers (hedges, boosters, evidentials) in text.
 * Lexicon-based detection within single clauses.
 *
 * Marker Types:
 * - Hedges: Reduce certainty ("might", "possibly", "seems")
 * - Boosters: Increase certainty ("definitely", "clearly", "must")
 * - Evidentials: Mark source of information ("reportedly", "allegedly")
 *
 * @module analyzers/CertaintyAnalyzer
 * @version 1.0.0
 */

/**
 * Hedge markers - reduce certainty/commitment
 * Includes modal hedges, epistemic adverbs, and hedging verbs
 */
const HEDGES = {
  // Modal hedges (auxiliary verbs)
  'might': { strength: 0.4, type: 'modal' },
  'may': { strength: 0.5, type: 'modal' },
  'could': { strength: 0.5, type: 'modal' },
  'would': { strength: 0.6, type: 'modal' },

  // Epistemic adverbs
  'possibly': { strength: 0.4, type: 'adverb' },
  'perhaps': { strength: 0.4, type: 'adverb' },
  'maybe': { strength: 0.4, type: 'adverb' },
  'probably': { strength: 0.6, type: 'adverb' },
  'likely': { strength: 0.6, type: 'adverb' },
  'presumably': { strength: 0.5, type: 'adverb' },
  'seemingly': { strength: 0.5, type: 'adverb' },
  'apparently': { strength: 0.5, type: 'adverb' },
  'potentially': { strength: 0.5, type: 'adverb' },
  'conceivably': { strength: 0.4, type: 'adverb' },
  'ostensibly': { strength: 0.5, type: 'adverb' },

  // Hedging verbs
  'seems': { strength: 0.5, type: 'verb' },
  'seem': { strength: 0.5, type: 'verb' },
  'appears': { strength: 0.5, type: 'verb' },
  'appear': { strength: 0.5, type: 'verb' },
  'suggests': { strength: 0.5, type: 'verb' },
  'suggest': { strength: 0.5, type: 'verb' },
  'indicates': { strength: 0.6, type: 'verb' },
  'indicate': { strength: 0.6, type: 'verb' },
  'tends': { strength: 0.6, type: 'verb' },
  'tend': { strength: 0.6, type: 'verb' },

  // Approximators
  'about': { strength: 0.7, type: 'approximator' },
  'approximately': { strength: 0.7, type: 'approximator' },
  'around': { strength: 0.7, type: 'approximator' },
  'roughly': { strength: 0.6, type: 'approximator' },
  'somewhat': { strength: 0.6, type: 'approximator' },
  'relatively': { strength: 0.7, type: 'approximator' },
  'fairly': { strength: 0.7, type: 'approximator' }
};

/**
 * Booster markers - increase certainty/commitment
 * Includes modal boosters, intensifying adverbs, and emphatic expressions
 */
const BOOSTERS = {
  // Modal boosters (strong obligation/certainty)
  'must': { strength: 0.95, type: 'modal' },
  'shall': { strength: 0.9, type: 'modal' },
  'will': { strength: 0.85, type: 'modal' },

  // Intensifying adverbs
  'definitely': { strength: 0.95, type: 'adverb' },
  'certainly': { strength: 0.95, type: 'adverb' },
  'clearly': { strength: 0.9, type: 'adverb' },
  'obviously': { strength: 0.9, type: 'adverb' },
  'undoubtedly': { strength: 0.95, type: 'adverb' },
  'absolutely': { strength: 1.0, type: 'adverb' },
  'unquestionably': { strength: 0.95, type: 'adverb' },
  'surely': { strength: 0.85, type: 'adverb' },
  'indeed': { strength: 0.8, type: 'adverb' },
  'truly': { strength: 0.85, type: 'adverb' },
  'really': { strength: 0.75, type: 'adverb' },
  'actually': { strength: 0.8, type: 'adverb' },
  'always': { strength: 0.9, type: 'adverb' },
  'never': { strength: 0.9, type: 'adverb' },
  'inevitably': { strength: 0.9, type: 'adverb' },

  // Emphatic verbs/phrases
  'proves': { strength: 0.9, type: 'verb' },
  'prove': { strength: 0.9, type: 'verb' },
  'confirms': { strength: 0.85, type: 'verb' },
  'confirm': { strength: 0.85, type: 'verb' },
  'demonstrates': { strength: 0.85, type: 'verb' },
  'demonstrate': { strength: 0.85, type: 'verb' },
  'establishes': { strength: 0.85, type: 'verb' },
  'establish': { strength: 0.85, type: 'verb' },
  'shows': { strength: 0.8, type: 'verb' },
  'show': { strength: 0.8, type: 'verb' }
};

/**
 * Evidential markers - indicate source of information
 * Marks claims as reported/attributed rather than asserted
 */
const EVIDENTIALS = {
  // Reported speech markers
  'reportedly': { sourceType: 'reported', reliability: 0.6 },
  'allegedly': { sourceType: 'reported', reliability: 0.4 },
  'supposedly': { sourceType: 'reported', reliability: 0.5 },
  'purportedly': { sourceType: 'reported', reliability: 0.5 },

  // Attribution markers
  'according': { sourceType: 'attributed', reliability: 0.7 },  // "according to"
  'claims': { sourceType: 'attributed', reliability: 0.5 },
  'claim': { sourceType: 'attributed', reliability: 0.5 },
  'states': { sourceType: 'attributed', reliability: 0.7 },
  'state': { sourceType: 'attributed', reliability: 0.7 },
  'reports': { sourceType: 'attributed', reliability: 0.7 },
  'report': { sourceType: 'attributed', reliability: 0.7 },

  // Hearsay markers
  'said': { sourceType: 'hearsay', reliability: 0.6 },
  'says': { sourceType: 'hearsay', reliability: 0.6 },
  'told': { sourceType: 'hearsay', reliability: 0.6 },
  'announced': { sourceType: 'hearsay', reliability: 0.7 }
};

/**
 * CertaintyAnalyzer class
 * Detects and classifies certainty markers in text
 */
class CertaintyAnalyzer {
  /**
   * Create a CertaintyAnalyzer
   * @param {Object} [options] - Configuration options
   * @param {boolean} [options.includePositions=true] - Include marker positions
   */
  constructor(options = {}) {
    this.options = {
      includePositions: true,
      ...options
    };
  }

  /**
   * Analyze text for certainty markers
   * @param {string} text - Text to analyze
   * @returns {Object} Certainty analysis result
   */
  analyze(text) {
    const lowerText = text.toLowerCase();
    const words = this._tokenize(text);

    const hedges = this._detectMarkers(lowerText, words, HEDGES, 'hedge');
    const boosters = this._detectMarkers(lowerText, words, BOOSTERS, 'booster');
    const evidentials = this._detectMarkers(lowerText, words, EVIDENTIALS, 'evidential');

    // Calculate overall certainty score
    const certaintyScore = this._calculateCertaintyScore(hedges, boosters);

    // Determine dominant marker type
    const dominantType = this._getDominantType(hedges, boosters, evidentials);

    return {
      certaintyScore,
      dominantType,
      hedges,
      boosters,
      evidentials,
      isHedged: hedges.length > 0,
      isBoosted: boosters.length > 0,
      isEvidential: evidentials.length > 0,
      markerCount: hedges.length + boosters.length + evidentials.length
    };
  }

  /**
   * Analyze a specific claim or assertion
   * @param {string} claimText - The claim text
   * @param {Object} [context] - Additional context
   * @returns {Object} Claim certainty analysis
   */
  analyzeClaimCertainty(claimText, context = {}) {
    const analysis = this.analyze(claimText);

    return {
      'tagteam:certaintyScore': analysis.certaintyScore,
      'tagteam:certaintyType': analysis.dominantType,
      'tagteam:hedges': analysis.hedges.map(h => h.marker),
      'tagteam:boosters': analysis.boosters.map(b => b.marker),
      'tagteam:evidentials': analysis.evidentials.map(e => ({
        marker: e.marker,
        sourceType: e.sourceType
      })),
      'tagteam:isHedged': analysis.isHedged,
      'tagteam:isReported': analysis.isEvidential
    };
  }

  /**
   * Detect markers of a specific type
   * @private
   */
  _detectMarkers(lowerText, words, lexicon, markerType) {
    const detected = [];

    for (const [marker, info] of Object.entries(lexicon)) {
      // Check if marker appears in text
      const regex = new RegExp(`\\b${marker}\\b`, 'gi');
      let match;

      while ((match = regex.exec(lowerText)) !== null) {
        const markerInfo = {
          marker,
          type: markerType,
          position: this.options.includePositions ? match.index : undefined
        };

        // Add type-specific info
        if (markerType === 'hedge' || markerType === 'booster') {
          markerInfo.strength = info.strength;
          markerInfo.subtype = info.type;
        } else if (markerType === 'evidential') {
          markerInfo.sourceType = info.sourceType;
          markerInfo.reliability = info.reliability;
        }

        detected.push(markerInfo);
      }
    }

    return detected;
  }

  /**
   * Calculate overall certainty score (0-1)
   * @private
   */
  _calculateCertaintyScore(hedges, boosters) {
    // Start with neutral certainty
    let score = 0.5;

    // Hedges reduce certainty
    for (const hedge of hedges) {
      // Apply hedge effect: pull score toward hedge strength
      const hedgeEffect = (hedge.strength - score) * 0.3;
      score += hedgeEffect;
    }

    // Boosters increase certainty
    for (const booster of boosters) {
      // Apply booster effect: pull score toward booster strength
      const boostEffect = (booster.strength - score) * 0.3;
      score += boostEffect;
    }

    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Determine dominant marker type
   * @private
   */
  _getDominantType(hedges, boosters, evidentials) {
    if (evidentials.length > 0) return 'evidential';
    if (hedges.length > boosters.length) return 'hedged';
    if (boosters.length > hedges.length) return 'boosted';
    if (hedges.length > 0 && boosters.length > 0) return 'mixed';
    return 'neutral';
  }

  /**
   * Simple tokenizer
   * @private
   */
  _tokenize(text) {
    return text.toLowerCase().split(/\s+/).map(w => w.replace(/[^\w]/g, ''));
  }

  /**
   * Get all markers in the lexicon
   * @returns {Object} All marker lexicons
   */
  static getLexicon() {
    return {
      hedges: HEDGES,
      boosters: BOOSTERS,
      evidentials: EVIDENTIALS
    };
  }

  /**
   * Get marker count
   * @returns {number} Total markers in lexicon
   */
  static getMarkerCount() {
    return Object.keys(HEDGES).length +
           Object.keys(BOOSTERS).length +
           Object.keys(EVIDENTIALS).length;
  }
}

module.exports = CertaintyAnalyzer;
