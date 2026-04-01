/**
 * TokenReIndexer.js — Bridge sentence-relative and document-relative positions
 *
 * Source: TagTeam Sentence Boundary Architecture Specification v1.3 §5.2
 *
 * Maps sentence-relative parser output to document-relative provenance.
 * Enforces the Relative-Indexing Contract (§3.4): arc indices stay sentence-relative.
 */

'use strict';

/**
 * Re-index a parsed sentence's output to include document-relative offsets.
 *
 * @param {Object} parserOutput - Raw parser output with tokens, tags, arcs
 * @param {number[]} sentenceSpan - [startTokenIdx, endTokenIdx] document-relative (inclusive)
 * @param {string[]} documentTokens - Full document token array
 * @param {Array} [cddSpans] - Optional CDD spans (document-relative) to filter and convert
 * @returns {Object} ReIndexedSentence with documentOffsets and sentence-relative lockedSpans
 */
function reIndex(parserOutput, sentenceSpan, documentTokens, cddSpans) {
  const sentTokenCount = parserOutput.tokens.length;
  const expectedCount = sentenceSpan[1] - sentenceSpan[0] + 1;

  // Cardinality check (§4.6.6)
  if (sentTokenCount !== expectedCount) {
    throw new Error(
      `TokenSpanCardinalityError: sentence has ${sentTokenCount} tokens but ` +
      `tokenSpan [${sentenceSpan[0]}, ${sentenceSpan[1]}] implies ${expectedCount}. ` +
      `These must be equal (SBA v1.3 §5.2).`
    );
  }

  // Build document offsets: documentOffsets[i] = document token index for sentence token i
  const documentOffsets = [];
  for (let i = 0; i < sentTokenCount; i++) {
    documentOffsets.push(sentenceSpan[0] + i);
  }

  // Filter and convert CDD spans to sentence-relative positions
  let localCDDSpans = [];
  if (cddSpans && cddSpans.length > 0) {
    for (const span of cddSpans) {
      // Span must fall entirely within this sentence's token range
      if (span.startToken >= sentenceSpan[0] + 1 && span.endToken <= sentenceSpan[1] + 1) {
        localCDDSpans.push({
          text: span.text,
          startToken: span.startToken - sentenceSpan[0],
          endToken: span.endToken - sentenceSpan[0],
          components: span.components
        });
      }
    }
  }

  return {
    sentenceRecord: {
      tokens: parserOutput.tokens,
      tags: parserOutput.tags,
      arcs: parserOutput.arcs, // sentence-relative — NOT converted
      tokenSpan: sentenceSpan,
    },
    documentOffsets,
    localCDDSpans,
  };
}

module.exports = { reIndex };
