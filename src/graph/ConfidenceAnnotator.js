/**
 * ConfidenceAnnotator — Phase 3B
 *
 * Maps raw parser score margins to calibrated confidence buckets and
 * emits ambiguity signals for low-confidence arcs.
 *
 * Confidence buckets are derived from calibrated probability:
 *   - "high":   calibrated probability >= 0.9
 *   - "medium": calibrated probability >= 0.6 and < 0.9
 *   - "low":    calibrated probability < 0.6
 *
 * PP-attachment arcs (obl, nmod) use tighter thresholds:
 *   - "high":   calibrated probability >= 0.95
 *   - "medium": calibrated probability >= 0.7 and < 0.95
 *   - "low":    calibrated probability < 0.7
 *
 * Authority: Major-Refactor-Roadmap.md AC-3.14 through AC-3.17
 */

'use strict';

// Labels that indicate PP-attachment (use tighter confidence thresholds)
const PP_LABELS = new Set(['obl', 'nmod']);

// Common alternative labels for ambiguity signals
const ALTERNATIVE_LABELS = {
  nsubj: 'obj',
  obj: 'nsubj',
  nsubj_pass: 'obj',
  obl: 'nmod',
  nmod: 'obl',
  iobj: 'obj',
  det: 'amod',
  amod: 'advmod',
  advcl: 'acl',
  acl: 'advcl',
};

class ConfidenceAnnotator {
  /**
   * @param {Object|null} calibration - Calibration table with bins array
   *   { bins: [{ margin: number, probability: number, count: number }] }
   */
  constructor(calibration) {
    this._calibration = calibration;
  }

  /**
   * Look up calibrated probability for a score margin.
   * @param {number} margin - Raw score margin from parser
   * @returns {number} Calibrated probability in [0, 1]
   */
  getCalibratedProbability(margin) {
    if (!this._calibration || !this._calibration.bins || this._calibration.bins.length === 0) {
      return 0.5;
    }
    const bins = this._calibration.bins;
    for (let i = bins.length - 1; i >= 0; i--) {
      if (margin >= bins[i].margin) {
        return bins[i].probability;
      }
    }
    return bins[0].probability;
  }

  /**
   * Determine confidence bucket from calibrated probability.
   * PP-attachment arcs use tighter thresholds.
   *
   * @param {number} probability - Calibrated probability
   * @param {boolean} isPP - Whether this is a PP-attachment arc
   * @returns {string} "high", "medium", or "low"
   */
  _getBucket(probability, isPP) {
    if (isPP) {
      if (probability >= 0.95) return 'high';
      if (probability >= 0.7) return 'medium';
      return 'low';
    }
    if (probability >= 0.9) return 'high';
    if (probability >= 0.6) return 'medium';
    return 'low';
  }

  /**
   * Annotate a single arc with confidence information.
   *
   * @param {Object} arc - { dependent, head, label, scoreMargin }
   * @returns {Object} Arc with added confidence annotations
   */
  annotateArc(arc) {
    const probability = this.getCalibratedProbability(arc.scoreMargin);
    const isPP = PP_LABELS.has(arc.label);
    const confidence = this._getBucket(probability, isPP);

    const result = {
      ...arc,
      parseConfidence: confidence,
      parseMargin: arc.scoreMargin,
      parseProbability: probability,
      confidence,
    };

    // PP-attachment: include alternative attachment analysis
    if (isPP) {
      const altLabel = arc.label === 'obl' ? 'nmod' : 'obl';
      result.alternativeAttachment = {
        ppHead: arc.head,
        ppNoun: arc.dependent,
        currentLabel: arc.label,
        alternativeLabel: altLabel,
      };
    }

    // Low confidence: emit ambiguity signal
    if (confidence === 'low') {
      const altLabel = ALTERNATIVE_LABELS[arc.label] ||
                       ALTERNATIVE_LABELS[arc.label.replace(':', '_')] ||
                       'dep';
      result.ambiguitySignal = {
        type: 'parse_uncertainty',
        affectedArc: { label: arc.label, dependent: arc.dependent, head: arc.head },
        alternativeLabel: altLabel,
        calibratedProbability: probability,
      };
    }

    return result;
  }

  /**
   * Annotate an array of arcs with confidence information.
   *
   * @param {Array} arcs - Array of { dependent, head, label, scoreMargin }
   * @returns {Array} Annotated arcs
   */
  annotateArcs(arcs) {
    return arcs.map(arc => this.annotateArc(arc));
  }

  /**
   * Compute aggregate confidence for an entity based on its constituent arcs.
   * Uses the minimum probability of all arcs in the entity's span.
   *
   * @param {Object} entity - Entity with headId and indices
   * @param {Array} annotatedArcs - Annotated arcs from annotateArcs()
   * @returns {Object} { confidence, probability, margin }
   */
  entityConfidence(entity, annotatedArcs) {
    const entityArcs = annotatedArcs.filter(a =>
      entity.indices && entity.indices.includes(a.dependent)
    );

    if (entityArcs.length === 0) {
      return { confidence: 'medium', probability: 0.5, margin: 0 };
    }

    const minProb = Math.min(...entityArcs.map(a => a.parseProbability));
    const minMargin = Math.min(...entityArcs.map(a => a.parseMargin));
    const confidence = this._getBucket(minProb, false);

    return { confidence, probability: minProb, margin: minMargin };
  }

  /**
   * Compute confidence for a role assignment.
   * Uses the minimum of entity confidence and act confidence.
   *
   * @param {Object} role - Role with entityId and actId
   * @param {Array} annotatedArcs - Annotated arcs
   * @returns {Object} { confidence, probability }
   */
  roleConfidence(role, annotatedArcs) {
    const entityArc = annotatedArcs.find(a => a.dependent === role.entityId);
    const actArc = annotatedArcs.find(a => a.dependent === role.actId);

    const entityProb = entityArc ? entityArc.parseProbability : 0.5;
    const actProb = actArc ? actArc.parseProbability : 0.5;
    const minProb = Math.min(entityProb, actProb);

    return {
      confidence: this._getBucket(minProb, false),
      probability: minProb,
    };
  }
  /**
   * Map genericity classification confidence to standard confidence buckets.
   * §9.5: Genericity confidence uses the same bucket thresholds as regular arcs.
   *
   * @param {{ category: string, confidence: number }} genericityResult
   * @returns {{ confidence: string, probability: number }}
   */
  genericityConfidence(genericityResult) {
    if (!genericityResult) return { confidence: 'low', probability: 0 };
    return {
      confidence: this._getBucket(genericityResult.confidence, false),
      probability: genericityResult.confidence,
    };
  }
}

// Export for Node.js / CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConfidenceAnnotator;
}
// Export for browser
if (typeof window !== 'undefined') {
  window.ConfidenceAnnotator = ConfidenceAnnotator;
}
