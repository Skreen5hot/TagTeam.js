/**
 * ComplexityBudget.js
 *
 * Enforces complexity limits on graph construction to prevent explosion.
 * Implements configurable budgets for nodes, referents, assertions, and text length.
 *
 * Default Limits (from PHASE4_ANSWERS.md):
 * - Max 200 nodes per graph
 * - Max 30 discourse referents
 * - Max 50 assertion events
 * - Max 2000 characters input text
 * - Max 500ms parse time
 *
 * @module graph/ComplexityBudget
 * @version 4.0.0-phase4-week3
 */

/**
 * Complexity budget error types
 */
const BudgetError = {
  MAX_NODES: 'MAX_NODES',
  MAX_REFERENTS: 'MAX_REFERENTS',
  MAX_ASSERTIONS: 'MAX_ASSERTIONS',
  MAX_TEXT_LENGTH: 'MAX_TEXT_LENGTH',
  MAX_PARSE_TIME: 'MAX_PARSE_TIME'
};

/**
 * Complexity Budget Manager
 */
class ComplexityBudget {
  /**
   * Create a new ComplexityBudget
   *
   * @param {Object} options - Budget configuration
   * @param {number} [options.maxNodes=200] - Maximum nodes in graph
   * @param {number} [options.maxReferents=30] - Maximum discourse referents
   * @param {number} [options.maxAssertions=50] - Maximum assertion events
   * @param {number} [options.maxTextLength=2000] - Maximum input text chars
   * @param {number} [options.maxParseTime=500] - Maximum parse time in ms
   * @param {boolean} [options.throwOnExceed=true] - Throw error when exceeded
   * @param {boolean} [options.autoChunk=false] - Auto-chunk on exceed
   *
   * @example
   * const budget = new ComplexityBudget({ maxNodes: 100 });
   * budget.addNode('DiscourseReferent');
   * console.log(budget.getUsage()); // { nodes: 1, referents: 1, ... }
   */
  constructor(options = {}) {
    // Budget limits
    this.maxNodes = options.maxNodes ?? 200;
    this.maxReferents = options.maxReferents ?? 30;
    this.maxAssertions = options.maxAssertions ?? 50;
    this.maxTextLength = options.maxTextLength ?? 2000;
    this.maxParseTime = options.maxParseTime ?? 500;

    // Behavior options
    this.throwOnExceed = options.throwOnExceed !== false;
    this.autoChunk = options.autoChunk || false;

    // Current counts
    this.nodeCount = 0;
    this.referentCount = 0;
    this.assertionCount = 0;
    this.textLength = 0;
    this.startTime = null;

    // Tracking
    this.warnings = [];
    this.exceeded = false;
    this.truncated = false;
  }

  /**
   * Reset the budget counters for a new parse
   */
  reset() {
    this.nodeCount = 0;
    this.referentCount = 0;
    this.assertionCount = 0;
    this.textLength = 0;
    this.startTime = null;
    this.warnings = [];
    this.exceeded = false;
    this.truncated = false;
  }

  /**
   * Start timing the parse operation
   */
  startParse() {
    this.startTime = Date.now();
  }

  /**
   * Check if text length is within budget
   *
   * @param {string} text - Input text to check
   * @returns {boolean} True if within budget
   * @throws {Error} If throwOnExceed is true and budget exceeded
   */
  checkTextLength(text) {
    this.textLength = text.length;

    if (this.textLength > this.maxTextLength) {
      const error = this._createError(
        BudgetError.MAX_TEXT_LENGTH,
        `Text length (${this.textLength}) exceeds maximum (${this.maxTextLength}). Consider chunking the input.`
      );

      if (this.throwOnExceed) {
        throw error;
      }

      this.exceeded = true;
      this.warnings.push(error.message);
      return false;
    }

    return true;
  }

  /**
   * Check if a node can be added
   *
   * @param {string} nodeType - Type of node to add
   * @returns {boolean} True if node can be added
   * @throws {Error} If throwOnExceed is true and budget exceeded
   */
  canAddNode(nodeType) {
    // Check total nodes
    if (this.nodeCount >= this.maxNodes) {
      return this._handleExceeded(
        BudgetError.MAX_NODES,
        `Maximum nodes (${this.maxNodes}) exceeded. Graph construction will be truncated.`
      );
    }

    // Check referent limit
    if (this._isReferentType(nodeType) && this.referentCount >= this.maxReferents) {
      return this._handleExceeded(
        BudgetError.MAX_REFERENTS,
        `Maximum discourse referents (${this.maxReferents}) exceeded. Consider chunking input.`
      );
    }

    // Check assertion limit
    if (this._isAssertionType(nodeType) && this.assertionCount >= this.maxAssertions) {
      return this._handleExceeded(
        BudgetError.MAX_ASSERTIONS,
        `Maximum assertion events (${this.maxAssertions}) exceeded. Consider chunking input.`
      );
    }

    // Check parse time
    if (this.startTime && (Date.now() - this.startTime) > this.maxParseTime) {
      return this._handleExceeded(
        BudgetError.MAX_PARSE_TIME,
        `Parse time exceeded maximum (${this.maxParseTime}ms). Consider chunking input.`
      );
    }

    return true;
  }

  /**
   * Add a node to the budget tracking
   *
   * @param {string} nodeType - Type of node being added
   * @returns {boolean} True if added successfully
   * @throws {Error} If throwOnExceed is true and budget exceeded
   */
  addNode(nodeType) {
    if (!this.canAddNode(nodeType)) {
      this.truncated = true;
      return false;
    }

    this.nodeCount++;

    if (this._isReferentType(nodeType)) {
      this.referentCount++;
    }

    if (this._isAssertionType(nodeType)) {
      this.assertionCount++;
    }

    return true;
  }

  /**
   * Add multiple nodes at once
   *
   * @param {Array<string>} nodeTypes - Array of node types
   * @returns {number} Number of nodes successfully added
   */
  addNodes(nodeTypes) {
    let added = 0;
    for (const type of nodeTypes) {
      if (this.addNode(type)) {
        added++;
      } else {
        break; // Stop on first failure
      }
    }
    return added;
  }

  /**
   * Get current usage statistics
   *
   * @returns {Object} Current budget usage
   */
  getUsage() {
    const elapsed = this.startTime ? Date.now() - this.startTime : 0;

    return {
      nodes: {
        current: this.nodeCount,
        max: this.maxNodes,
        percentage: Math.round((this.nodeCount / this.maxNodes) * 100)
      },
      referents: {
        current: this.referentCount,
        max: this.maxReferents,
        percentage: Math.round((this.referentCount / this.maxReferents) * 100)
      },
      assertions: {
        current: this.assertionCount,
        max: this.maxAssertions,
        percentage: Math.round((this.assertionCount / this.maxAssertions) * 100)
      },
      textLength: {
        current: this.textLength,
        max: this.maxTextLength,
        percentage: Math.round((this.textLength / this.maxTextLength) * 100)
      },
      parseTime: {
        current: elapsed,
        max: this.maxParseTime,
        percentage: Math.round((elapsed / this.maxParseTime) * 100)
      },
      exceeded: this.exceeded,
      truncated: this.truncated,
      warnings: this.warnings
    };
  }

  /**
   * Check if graph was truncated due to budget limits
   *
   * @returns {boolean} True if truncated
   */
  wasTruncated() {
    return this.truncated;
  }

  /**
   * Check if any budget limit was exceeded
   *
   * @returns {boolean} True if exceeded
   */
  wasExceeded() {
    return this.exceeded;
  }

  /**
   * Get remaining capacity
   *
   * @returns {Object} Remaining capacity for each metric
   */
  getRemaining() {
    return {
      nodes: this.maxNodes - this.nodeCount,
      referents: this.maxReferents - this.referentCount,
      assertions: this.maxAssertions - this.assertionCount,
      textChars: this.maxTextLength - this.textLength
    };
  }

  /**
   * Estimate if text needs chunking
   *
   * @param {string} text - Input text
   * @returns {Object} Chunking recommendation
   */
  estimateChunking(text) {
    const textLength = text.length;
    const needsChunking = textLength > this.maxTextLength;

    if (!needsChunking) {
      return {
        needsChunking: false,
        chunks: 1,
        recommendation: null
      };
    }

    // Estimate chunks needed
    const estimatedChunks = Math.ceil(textLength / this.maxTextLength);

    return {
      needsChunking: true,
      chunks: estimatedChunks,
      textLength,
      maxTextLength: this.maxTextLength,
      recommendation: `Text (${textLength} chars) exceeds maximum (${this.maxTextLength}). ` +
        `Recommend splitting into ${estimatedChunks} chunks.`
    };
  }

  /**
   * Chunk text into budget-compliant pieces
   *
   * @param {string} text - Input text to chunk
   * @param {Object} options - Chunking options
   * @param {number} [options.maxChars] - Max chars per chunk (default: maxTextLength)
   * @param {boolean} [options.preserveSentences=true] - Split on sentence boundaries
   * @returns {Array<Object>} Array of chunk objects
   */
  chunkText(text, options = {}) {
    const maxChars = options.maxChars || this.maxTextLength;
    const preserveSentences = options.preserveSentences !== false;

    if (text.length <= maxChars) {
      return [{
        index: 0,
        text: text,
        startOffset: 0,
        endOffset: text.length
      }];
    }

    const chunks = [];

    if (preserveSentences) {
      // Split on sentence boundaries
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      let currentChunk = '';
      let currentOffset = 0;
      let chunkStartOffset = 0;

      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxChars) {
          if (currentChunk) {
            chunks.push({
              index: chunks.length,
              text: currentChunk.trim(),
              startOffset: chunkStartOffset,
              endOffset: currentOffset
            });
          }
          currentChunk = sentence;
          chunkStartOffset = currentOffset;
        } else {
          currentChunk += sentence;
        }
        currentOffset += sentence.length;
      }

      if (currentChunk) {
        chunks.push({
          index: chunks.length,
          text: currentChunk.trim(),
          startOffset: chunkStartOffset,
          endOffset: currentOffset
        });
      }
    } else {
      // Simple character-based splitting
      let offset = 0;
      while (offset < text.length) {
        const endOffset = Math.min(offset + maxChars, text.length);
        chunks.push({
          index: chunks.length,
          text: text.substring(offset, endOffset),
          startOffset: offset,
          endOffset: endOffset
        });
        offset = endOffset;
      }
    }

    return chunks;
  }

  /**
   * Get metadata for inclusion in graph output
   *
   * @returns {Object} Budget metadata for JSON-LD
   */
  getMetadata() {
    const usage = this.getUsage();

    return {
      'tagteam:budgetUsage': {
        nodes: usage.nodes.current,
        referents: usage.referents.current,
        assertions: usage.assertions.current
      },
      'tagteam:truncated': this.truncated,
      'tagteam:budgetWarnings': this.warnings.length > 0 ? this.warnings : undefined
    };
  }

  // ================================================================
  // Private Methods
  // ================================================================

  /**
   * Check if node type is a discourse referent
   * @private
   */
  _isReferentType(nodeType) {
    if (!nodeType) return false;
    return nodeType.includes('DiscourseReferent') ||
      nodeType.includes('Person') ||
      nodeType.includes('Agent') ||
      nodeType.includes('Artifact');
  }

  /**
   * Check if node type is an assertion event
   * @private
   */
  _isAssertionType(nodeType) {
    if (!nodeType) return false;
    return nodeType.includes('AssertionEvent') ||
      nodeType.includes('ValueAssertionEvent') ||
      nodeType.includes('ContextAssessmentEvent');
  }

  /**
   * Handle budget exceeded
   * @private
   */
  _handleExceeded(errorType, message) {
    this.exceeded = true;
    this.warnings.push(message);

    if (this.throwOnExceed) {
      throw this._createError(errorType, message);
    }

    return false;
  }

  /**
   * Create a budget error
   * @private
   */
  _createError(type, message) {
    const error = new Error(message);
    error.name = 'ComplexityBudgetError';
    error.type = type;
    error.budget = this.getUsage();
    return error;
  }
}

// Export error types
ComplexityBudget.BudgetError = BudgetError;

module.exports = ComplexityBudget;
