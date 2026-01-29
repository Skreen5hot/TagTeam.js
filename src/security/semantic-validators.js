'use strict';

/**
 * Semantic Security Validators
 *
 * Heuristic detectors for semantic manipulation patterns (T3-T6).
 * These flag suspicious input for human review — they are NOT guarantees.
 *
 * @module security/semantic-validators
 */

class SemanticSecurityValidator {

  /**
   * T3: Entity boundary manipulation — high connector density.
   * @param {string} text
   * @returns {Array<{code: string, confidence: string, recommendation: string}>}
   */
  checkEntityBoundaries(text) {
    const words = text.split(/\s+/);
    const connectors = (text.match(/\b(and|or|of|for)\b/gi) || []).length;
    const density = connectors / words.length;

    if (density > 0.15) {
      return [{
        code: 'HIGH_CONNECTOR_DENSITY',
        confidence: 'heuristic',
        recommendation: 'Review entity boundaries'
      }];
    }
    return [];
  }

  /**
   * T4: Actuality status manipulation — hypothetical framing of factual verbs.
   * @param {string} text
   * @returns {Array<{code: string, confidence: string, recommendation: string}>}
   */
  checkActualityMarkers(text) {
    if (/hypothetically[,\s]+[\w\s]+(?:did|committed)/gi.test(text)) {
      return [{
        code: 'ACTUALITY_CONFUSION',
        confidence: 'heuristic',
        recommendation: 'Verify actuality assignments'
      }];
    }
    return [];
  }

  /**
   * T5: Negation obfuscation — buried or indirect negation.
   * @param {string} text
   * @returns {Array<{code: string, confidence: string, recommendation: string}>}
   */
  checkNegationPatterns(text) {
    if (/was\s+\w+\s+in\s+no\s+/gi.test(text) || /absence\s+of\s+/gi.test(text)) {
      return [{
        code: 'BURIED_NEGATION',
        confidence: 'heuristic',
        recommendation: 'Verify polarity assignments'
      }];
    }
    return [];
  }

  /**
   * T6: Salience inflation — excessive emphasis words.
   * @param {string} text
   * @returns {Array<{code: string, confidence: string, count?: number, recommendation: string}>}
   */
  checkSalienceMarkers(text) {
    const count = (text.match(/\b(primary|essential|crucial|critical|key|fundamental)\b/gi) || []).length;
    if (count > 5) {
      return [{
        code: 'EXCESSIVE_EMPHASIS',
        confidence: 'heuristic',
        count,
        recommendation: 'Review salience scores'
      }];
    }
    return [];
  }

  /**
   * Run all heuristic checks on input text.
   * @param {string} text
   * @returns {{ warnings: Array, disclaimer: string }}
   */
  validate(text) {
    return {
      warnings: [
        ...this.checkEntityBoundaries(text),
        ...this.checkActualityMarkers(text),
        ...this.checkNegationPatterns(text),
        ...this.checkSalienceMarkers(text),
      ],
      disclaimer: 'Heuristic checks only. Does not guarantee attack prevention.'
    };
  }
}

module.exports = { SemanticSecurityValidator };
