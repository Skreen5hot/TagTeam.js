/**
 * DependencyParser.js — Arc-Eager Transition-Based Dependency Parser (Inference)
 *
 * Source: TagTeam-Major-Refactor-v2.2.md §7
 * Authority: Nivre 2003 (arc-eager), Goldberg & Nivre 2012 (dynamic oracle)
 *
 * Greedy left-to-right arc-eager parsing with averaged perceptron scoring.
 * Produces UD v2 labeled dependency arcs with score margins for confidence
 * propagation (§13).
 *
 * Transition system (4 transitions):
 *   SHIFT:           Move buffer[0] → top of stack
 *   LEFT-ARC(label): Arc from buffer[0] → stack[-1], pop stack[-1]
 *   RIGHT-ARC(label): Arc from stack[-1] → buffer[0], push buffer[0] to stack
 *   REDUCE:          Pop stack[-1] (must already have a head)
 *
 * @example
 * const model = require('./data/dep-weights-pruned.json');
 * const parser = new DependencyParser(model);
 * const result = parser.parse(['The', 'doctor', 'treated'], ['DT', 'NN', 'VBD']);
 * // result.arcs = [{ dependent, head, label, scoreMargin }, ...]
 */

'use strict';

class DependencyParser {
  /**
   * @param {Object} model - Trained model with weights, labels, transitions, provenance
   */
  constructor(model) {
    this.weights = model.weights;           // bucket_id → transition → weight (or feature → transition → weight)
    this.labels = model.labels;             // UD v2 label list
    this.transitions = model.transitions;   // valid transition strings
    this.provenance = model.provenance;     // training metadata
    this.numBuckets = model.numBuckets || 0; // 0 = no hashing (feature strings as keys)

    // Pre-compute transition → {type, label} lookup for fast application
    this._transitionMap = new Map();
    for (const t of this.transitions) {
      if (t === 'SHIFT') {
        this._transitionMap.set(t, { type: 'SHIFT', label: null });
      } else if (t === 'REDUCE') {
        this._transitionMap.set(t, { type: 'REDUCE', label: null });
      } else if (t.startsWith('LEFT-')) {
        this._transitionMap.set(t, { type: 'LEFT', label: t.slice(5) });
      } else if (t.startsWith('RIGHT-')) {
        this._transitionMap.set(t, { type: 'RIGHT', label: t.slice(6) });
      }
    }
  }

  /**
   * Parse a sentence, producing UD v2 labeled dependency arcs.
   *
   * @param {string[]} tokens - Word tokens (1-indexed internally, 0 = ROOT)
   * @param {string[]} tags - POS tags (same length as tokens)
   * @returns {{ arcs: Array<{dependent: number, head: number, label: string, scoreMargin: number}> }}
   */
  parse(tokens, tags) {
    const n = tokens.length;

    // Parser state: stack holds indices (0 = ROOT sentinel), buffer holds indices 1..n
    const stack = [0]; // ROOT
    const buffer = [];
    for (let i = 1; i <= n; i++) buffer.push(i);

    // Arc storage: heads[i] = head index, labels[i] = label, margins[i] = score margin
    const heads = new Array(n + 1).fill(-1);
    const depLabels = new Array(n + 1).fill(null);
    const margins = new Array(n + 1).fill(0);

    // Token data indexed 0..n (0 = ROOT)
    const words = ['ROOT', ...tokens];
    const posTags = ['ROOT', ...tags];

    // Left/right children tracking for features
    const leftChildren = new Array(n + 1).fill(null);  // leftmost child label
    const rightChildren = new Array(n + 1).fill(null); // rightmost child label
    const leftDepCount = new Array(n + 1).fill(0);     // number of left dependents
    const rightDepCount = new Array(n + 1).fill(0);    // number of right dependents

    // Main parsing loop
    while (buffer.length > 0 || stack.length > 1) {
      const validTransitions = this._getValidTransitions(stack, buffer, heads);
      if (validTransitions.length === 0) break; // should not happen in correct input

      // Extract features from current configuration
      const features = this._getFeatures(stack, buffer, words, posTags, heads, depLabels, leftChildren, rightChildren, leftDepCount, rightDepCount);

      // Score all valid transitions
      const scores = this._scoreTransitions(features, validTransitions);

      // Pick best transition and compute score margin
      let bestIdx = 0;
      for (let i = 1; i < scores.length; i++) {
        if (scores[i].score > scores[bestIdx].score) bestIdx = i;
      }

      const bestScore = scores[bestIdx].score;
      let secondBest = -Infinity;
      for (let i = 0; i < scores.length; i++) {
        if (i !== bestIdx && scores[i].score > secondBest) {
          secondBest = scores[i].score;
        }
      }
      const scoreMargin = scores.length > 1 ? bestScore - secondBest : bestScore;

      const bestTransition = scores[bestIdx].transition;
      const parsed = this._transitionMap.get(bestTransition);

      // Apply transition
      this._applyTransition(parsed, stack, buffer, heads, depLabels, margins, scoreMargin, leftChildren, rightChildren, leftDepCount, rightDepCount);
    }

    // Final sweep: assign any remaining stack items (except ROOT) as root dependents
    while (stack.length > 1) {
      const idx = stack.pop();
      if (heads[idx] === -1) {
        heads[idx] = 0;
        depLabels[idx] = 'root';
        margins[idx] = 0; // low confidence for forced root
      }
    }

    // Build arcs array
    const arcs = [];
    for (let i = 1; i <= n; i++) {
      arcs.push({
        dependent: i,
        head: heads[i],
        label: depLabels[i] || 'dep',
        scoreMargin: margins[i]
      });
    }

    return { arcs };
  }

  /**
   * Get valid transitions for current parser state.
   *
   * Validity constraints (Nivre 2003):
   *   SHIFT:     buffer non-empty
   *   LEFT-ARC:  buffer non-empty, stack[-1] ≠ ROOT (0), stack[-1] has no head yet
   *   RIGHT-ARC: buffer non-empty
   *   REDUCE:    stack[-1] ≠ ROOT (0), stack[-1] already has a head
   *
   * @param {number[]} stack
   * @param {number[]} buffer
   * @param {number[]} heads
   * @returns {string[]} Valid transition names
   */
  _getValidTransitions(stack, buffer, heads) {
    const valid = [];
    const s0 = stack.length > 0 ? stack[stack.length - 1] : -1;

    // SHIFT: buffer must be non-empty
    if (buffer.length > 0) {
      valid.push('SHIFT');
    }

    // REDUCE: stack top is not ROOT, and already has a head
    if (s0 > 0 && heads[s0] !== -1) {
      valid.push('REDUCE');
    }

    // LEFT-ARC(label): buffer non-empty, stack top is not ROOT, and has no head yet
    if (buffer.length > 0 && s0 > 0 && heads[s0] === -1) {
      for (const t of this.transitions) {
        if (t.startsWith('LEFT-')) valid.push(t);
      }
    }

    // RIGHT-ARC(label): buffer must be non-empty
    if (buffer.length > 0) {
      for (const t of this.transitions) {
        if (t.startsWith('RIGHT-')) valid.push(t);
      }
    }

    return valid;
  }

  /**
   * Apply a transition to the parser state.
   *
   * @param {{type: string, label: string|null}} parsed - Parsed transition
   * @param {number[]} stack
   * @param {number[]} buffer
   * @param {number[]} heads
   * @param {string[]} depLabels
   * @param {number[]} margins
   * @param {number} scoreMargin
   * @param {string[]} leftChildren
   * @param {string[]} rightChildren
   * @param {number[]} leftDepCount
   * @param {number[]} rightDepCount
   */
  _applyTransition(parsed, stack, buffer, heads, depLabels, margins, scoreMargin, leftChildren, rightChildren, leftDepCount, rightDepCount) {
    const s0 = stack[stack.length - 1];

    switch (parsed.type) {
      case 'SHIFT':
        stack.push(buffer.shift());
        break;

      case 'LEFT': {
        // Arc: head = buffer[0], dependent = stack[-1]
        const dep = stack.pop();
        const head = buffer[0];
        heads[dep] = head;
        depLabels[dep] = parsed.label;
        margins[dep] = scoreMargin;
        // Update child tracking
        if (dep < head) {
          leftChildren[head] = parsed.label;
          leftDepCount[head]++;
        } else {
          rightChildren[head] = parsed.label;
          rightDepCount[head]++;
        }
        break;
      }

      case 'RIGHT': {
        // Arc: head = stack[-1], dependent = buffer[0]
        const dep = buffer.shift();
        const head = s0;
        heads[dep] = head;
        depLabels[dep] = parsed.label;
        margins[dep] = scoreMargin;
        stack.push(dep);
        // Update child tracking
        if (dep < head) {
          leftChildren[head] = parsed.label;
          leftDepCount[head]++;
        } else {
          rightChildren[head] = parsed.label;
          rightDepCount[head]++;
        }
        break;
      }

      case 'REDUCE':
        stack.pop();
        break;
    }
  }

  /**
   * Extract features from current parser configuration.
   *
   * ~40-60 features per state (§7.1):
   *   - Stack/buffer word and tag features
   *   - Child label features
   *   - Combined features (bigrams, trigrams)
   *
   * @returns {string[]} Feature strings
   */
  _getFeatures(stack, buffer, words, tags, heads, depLabels, leftChildren, rightChildren, leftDepCount, rightDepCount) {
    const features = ['bias'];

    // Stack positions
    const s0 = stack.length > 0 ? stack[stack.length - 1] : -1;
    const s1 = stack.length > 1 ? stack[stack.length - 2] : -1;

    // Buffer positions
    const b0 = buffer.length > 0 ? buffer[0] : -1;
    const b1 = buffer.length > 1 ? buffer[1] : -1;
    const b2 = buffer.length > 2 ? buffer[2] : -1;

    // Helper to get word/tag/label safely
    const w = (i) => i >= 0 ? words[i] : '_NULL_';
    const t = (i) => i >= 0 ? tags[i] : '_NULL_';
    const wl = (i) => i >= 0 ? words[i].toLowerCase() : '_null_';
    const dl = (i) => i >= 0 ? (depLabels[i] || '_NONE_') : '_NULL_';
    const lc = (i) => i >= 0 ? (leftChildren[i] || '_NONE_') : '_NULL_';
    const rc = (i) => i >= 0 ? (rightChildren[i] || '_NONE_') : '_NULL_';
    const nld = (i) => i >= 0 ? String(Math.min(leftDepCount[i], 3)) : '0';
    const nrd = (i) => i >= 0 ? String(Math.min(rightDepCount[i], 3)) : '0';

    // === Single features (§7.1 feature template) ===

    // Stack[0]
    if (s0 >= 0) {
      features.push('s0_word=' + w(s0));
      features.push('s0_word_lower=' + wl(s0));
      features.push('s0_tag=' + t(s0));
      features.push('s0_deprel=' + dl(s0));
      features.push('s0_lc=' + lc(s0));
      features.push('s0_rc=' + rc(s0));
    }

    // Stack[1]
    if (s1 >= 0) {
      features.push('s1_word=' + w(s1));
      features.push('s1_tag=' + t(s1));
    }

    // Buffer[0]
    if (b0 >= 0) {
      features.push('b0_word=' + w(b0));
      features.push('b0_word_lower=' + wl(b0));
      features.push('b0_tag=' + t(b0));
      features.push('b0_lc=' + lc(b0));
    }

    // Buffer[1]
    if (b1 >= 0) {
      features.push('b1_word=' + w(b1));
      features.push('b1_tag=' + t(b1));
    }

    // Buffer[2]
    if (b2 >= 0) {
      features.push('b2_tag=' + t(b2));
    }

    // === Combined features ===

    // s0 + b0 combinations (most informative)
    if (s0 >= 0 && b0 >= 0) {
      features.push('s0_tag+b0_tag=' + t(s0) + '+' + t(b0));
      features.push('s0_word+b0_tag=' + w(s0) + '+' + t(b0));
      features.push('s0_tag+b0_word=' + t(s0) + '+' + w(b0));
      features.push('s0_word+b0_word=' + w(s0) + '+' + w(b0));
      features.push('s0_word_lower+b0_word_lower=' + wl(s0) + '+' + wl(b0));
      features.push('b0_tag+s0_tag+s0_word_lower=' + t(b0) + '+' + t(s0) + '+' + wl(s0));
    }

    // s0 + b0 + specific features
    if (s0 >= 0 && b0 >= 0) {
      features.push('s0_tag+b0_tag+s0_word_lower=' + t(s0) + '+' + t(b0) + '+' + wl(s0));
      features.push('s0_tag+b0_tag+b0_word_lower=' + t(s0) + '+' + t(b0) + '+' + wl(b0));
      features.push('s0_word+b0_tag+b0_word_lower=' + w(s0) + '+' + t(b0) + '+' + wl(b0));
    }

    // s1 + s0 + b0 trigram
    if (s1 >= 0 && s0 >= 0 && b0 >= 0) {
      features.push('s1_tag+s0_tag+b0_tag=' + t(s1) + '+' + t(s0) + '+' + t(b0));
    }

    // s0 + b0 + b1 trigram
    if (s0 >= 0 && b0 >= 0 && b1 >= 0) {
      features.push('s0_tag+b0_tag+b1_tag=' + t(s0) + '+' + t(b0) + '+' + t(b1));
    }

    // s0 has head indicator
    if (s0 > 0 && heads[s0] !== -1) {
      features.push('s0_has_head');
    }

    // Buffer empty indicator
    if (buffer.length === 0) {
      features.push('b_empty');
    }

    // Combined state indicators
    if (s0 > 0 && heads[s0] !== -1 && buffer.length === 0) {
      features.push('s0_has_head+b_empty');
    }

    // Suffix features for b0 (helps with label prediction)
    if (b0 >= 0) {
      const bword = words[b0];
      const blen = bword.length;
      if (blen >= 3) features.push('b0_suf3=' + bword.slice(-3).toLowerCase());
      if (blen >= 2) features.push('b0_suf2=' + bword.slice(-2).toLowerCase());
    }

    // Suffix features for s0
    if (s0 > 0) {
      const sword = words[s0];
      const slen = sword.length;
      if (slen >= 3) features.push('s0_suf3=' + sword.slice(-3).toLowerCase());
      if (slen >= 2) features.push('s0_suf2=' + sword.slice(-2).toLowerCase());
    }

    // === Distance features (Zhang & Nivre 2011) ===
    if (s0 >= 0 && b0 >= 0) {
      const dist = Math.min(Math.abs(s0 - b0), 10);
      features.push('dist=' + dist);
      features.push('s0_tag+b0_tag+dist=' + t(s0) + '+' + t(b0) + '+' + dist);
      features.push('s0_word_lower+dist=' + wl(s0) + '+' + dist);
      features.push('b0_word_lower+dist=' + wl(b0) + '+' + dist);
    }

    // === Valency features (number of left/right dependents) ===
    if (s0 >= 0) {
      features.push('s0_n_ldeps=' + nld(s0));
      features.push('s0_n_rdeps=' + nrd(s0));
      features.push('s0_tag+s0_n_ldeps=' + t(s0) + '+' + nld(s0));
      features.push('s0_tag+s0_n_rdeps=' + t(s0) + '+' + nrd(s0));
    }

    if (b0 >= 0) {
      features.push('b0_n_ldeps=' + nld(b0));
      features.push('b0_tag+b0_n_ldeps=' + t(b0) + '+' + nld(b0));
    }

    // === Head features for s0 (if assigned) ===
    if (s0 > 0 && heads[s0] !== -1) {
      const h = heads[s0];
      features.push('s0_head_tag=' + t(h));
      features.push('s0_head_word_lower=' + wl(h));
      if (b0 >= 0) {
        features.push('s0_head_tag+b0_tag=' + t(h) + '+' + t(b0));
      }
    }

    // === Additional combined features ===
    if (s0 >= 0 && b0 >= 0) {
      features.push('s0_tag+s0_lc+b0_tag=' + t(s0) + '+' + lc(s0) + '+' + t(b0));
      features.push('s0_tag+s0_rc+b0_tag=' + t(s0) + '+' + rc(s0) + '+' + t(b0));
    }

    if (s1 >= 0 && s0 >= 0) {
      features.push('s1_tag+s0_tag=' + t(s1) + '+' + t(s0));
      features.push('s1_tag+s0_word_lower=' + t(s1) + '+' + wl(s0));
    }

    if (b0 >= 0 && b1 >= 0) {
      features.push('b0_tag+b1_tag=' + t(b0) + '+' + t(b1));
      features.push('b0_word_lower+b1_tag=' + wl(b0) + '+' + t(b1));
    }

    // Stack depth indicator
    const slen2 = Math.min(stack.length, 5);
    features.push('stack_depth=' + slen2);

    // Buffer length indicator (binned)
    const blen2 = Math.min(buffer.length, 5);
    features.push('buffer_len=' + blen2);

    // === Word shape features (helps with rare/unseen words) ===
    if (s0 > 0) {
      features.push('s0_shape=' + DependencyParser._wordShape(words[s0]));
    }
    if (b0 >= 0) {
      features.push('b0_shape=' + DependencyParser._wordShape(words[b0]));
    }
    if (s0 >= 0 && b0 >= 0) {
      features.push('s0_shape+b0_shape=' + DependencyParser._wordShape(s0 > 0 ? words[s0] : 'ROOT') + '+' + DependencyParser._wordShape(words[b0]));
    }

    // === Prefix features (first 3 chars — helps with morphology) ===
    if (s0 > 0) {
      features.push('s0_pre3=' + words[s0].slice(0, 3).toLowerCase());
    }
    if (b0 >= 0) {
      features.push('b0_pre3=' + words[b0].slice(0, 3).toLowerCase());
    }

    // === Second-order features (s0 deprel context) ===
    if (s0 > 0 && heads[s0] !== -1 && b0 >= 0) {
      features.push('s0_deprel+b0_tag=' + dl(s0) + '+' + t(b0));
      features.push('s0_deprel+s0_tag+b0_tag=' + dl(s0) + '+' + t(s0) + '+' + t(b0));
    }

    // Valency + distance combined
    if (s0 >= 0 && b0 >= 0) {
      features.push('s0_n_rdeps+dist=' + nrd(s0) + '+' + Math.min(Math.abs(s0 - b0), 10));
    }

    return features;
  }

  /**
   * Compute word shape: X=upper, x=lower, d=digit, -=hyphen, .=punct.
   * Runs are collapsed (e.g., "Obama" → "Xx", "2024" → "d").
   * @param {string} word
   * @returns {string} Shape string
   */
  static _wordShape(word) {
    let shape = '';
    let prev = '';
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      let c;
      if (ch >= 'A' && ch <= 'Z') c = 'X';
      else if (ch >= 'a' && ch <= 'z') c = 'x';
      else if (ch >= '0' && ch <= '9') c = 'd';
      else if (ch === '-') c = '-';
      else c = '.';
      if (c !== prev) {
        shape += c;
        prev = c;
      }
    }
    return shape || 'x';
  }

  /**
   * FNV-1a hash function for feature hashing (Weinberger et al. 2009).
   * Maps feature string to bucket index for compact model storage.
   *
   * @param {string} str - Feature string to hash
   * @param {number} numBuckets - Number of hash buckets
   * @returns {number} Bucket index [0, numBuckets)
   */
  static _fnv1a(str, numBuckets) {
    let hash = 0x811c9dc5; // FNV offset basis (32-bit)
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193); // FNV prime
    }
    return (hash >>> 0) % numBuckets;
  }

  /**
   * Score valid transitions using perceptron weights.
   *
   * @param {string[]} features
   * @param {string[]} validTransitions
   * @returns {Array<{transition: string, score: number}>}
   */
  _scoreTransitions(features, validTransitions) {
    const scores = validTransitions.map(t => ({ transition: t, score: 0 }));

    // Build a quick lookup for valid transitions
    const scoreMap = new Map();
    for (let i = 0; i < scores.length; i++) {
      scoreMap.set(scores[i].transition, i);
    }

    // Accumulate weights (support both hashed and string-keyed models)
    const useHash = this.numBuckets > 0;
    for (const feat of features) {
      const key = useHash ? String(DependencyParser._fnv1a(feat, this.numBuckets)) : feat;
      const w = this.weights[key];
      if (!w) continue;
      for (const t in w) {
        const idx = scoreMap.get(t);
        if (idx !== undefined) {
          scores[idx].score += w[t];
        }
      }
    }

    return scores;
  }

  /**
   * Look up calibrated probability for a score margin.
   * Uses isotonic regression bins from calibration table.
   *
   * @param {number} margin - Score margin value
   * @param {Object} calibration - Calibration table with bins array
   * @returns {number} Calibrated probability [0, 1]
   */
  getCalibratedProbability(margin, calibration) {
    if (!calibration || !calibration.bins || calibration.bins.length === 0) return 0.5;

    const bins = calibration.bins;

    // Find the bin containing this margin (bins sorted by margin threshold)
    for (let i = bins.length - 1; i >= 0; i--) {
      if (margin >= bins[i].margin) {
        return bins[i].probability;
      }
    }

    return bins[0].probability;
  }
}

// Export for Node.js / CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DependencyParser;
}
// Export for browser
if (typeof window !== 'undefined') {
  window.DependencyParser = DependencyParser;
}
