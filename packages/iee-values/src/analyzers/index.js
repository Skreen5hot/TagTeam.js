/**
 * Analyzers index
 *
 * Exports all analyzer classes for the IEE values package.
 */

const ContextAnalyzer = require('./ContextAnalyzer');
const ValueMatcher = require('./ValueMatcher');
const ValueScorer = require('./ValueScorer');
const EthicalProfiler = require('./EthicalProfiler');

module.exports = {
  ContextAnalyzer,
  ValueMatcher,
  ValueScorer,
  EthicalProfiler
};
