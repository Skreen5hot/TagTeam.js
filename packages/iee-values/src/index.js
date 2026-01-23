/**
 * tagteam-iee-values
 *
 * IEE ethical value detection for TagTeam semantic graphs.
 * This package extends tagteam-core with value and context analysis.
 *
 * @module tagteam-iee-values
 * @version 1.0.0
 */

// Main entry points
const IEEGraphBuilder = require('./IEEGraphBuilder');
const ValueAnalyzer = require('./ValueAnalyzer');

// Analyzers
const ContextAnalyzer = require('./analyzers/ContextAnalyzer');
const ValueMatcher = require('./analyzers/ValueMatcher');
const ValueScorer = require('./analyzers/ValueScorer');
const EthicalProfiler = require('./analyzers/EthicalProfiler');

// Graph components
const AssertionEventBuilder = require('./graph/AssertionEventBuilder');

// Data
const { VALUE_DEFINITIONS, FRAME_VALUE_BOOSTS, CONFLICT_PAIRS } = require('../data');

module.exports = {
  // Main entry points
  IEEGraphBuilder,
  ValueAnalyzer,

  // Analyzers
  ContextAnalyzer,
  ValueMatcher,
  ValueScorer,
  EthicalProfiler,

  // Graph components
  AssertionEventBuilder,

  // Data exports
  VALUE_DEFINITIONS,
  FRAME_VALUE_BOOSTS,
  CONFLICT_PAIRS,

  // Version
  version: '1.0.0'
};
