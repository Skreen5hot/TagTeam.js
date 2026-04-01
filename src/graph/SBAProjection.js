/**
 * SBAProjection.js — JSON-to-RDF Projection for SBA Metadata
 *
 * Source: TagTeam Sentence Boundary Architecture Specification v1.3 §4.6
 *
 * Deterministic projection from _metadata JSON to RDF triples (as JSON-LD nodes).
 * All SBA SHACL shapes (§6) operate on the output of this projection.
 *
 * Input:  buildGraph() result { '@graph': [...], _metadata: {...} }
 * Output: { nodes: [...], parsingActIri: string }
 */

'use strict';

// ============================================================================
// TokenSpanCardinalityError (§4.6.6)
// ============================================================================

class TokenSpanCardinalityError extends Error {
  constructor(sentenceIndex, tokenCount, spanStart, spanEnd) {
    const implied = spanEnd - spanStart + 1;
    super(
      `TokenSpanCardinalityError: sentence ${sentenceIndex} has ${tokenCount} tokens ` +
      `but tokenSpan [${spanStart}, ${spanEnd}] implies ${implied}. ` +
      `These must be equal (SBA v1.3 §4.6.6).`
    );
    this.name = 'TokenSpanCardinalityError';
    this.sentenceIndex = sentenceIndex;
    this.tokenCount = tokenCount;
    this.spanStart = spanStart;
    this.spanEnd = spanEnd;
  }
}

// ============================================================================
// Projection
// ============================================================================

/**
 * Project _metadata JSON to RDF nodes per §4.6.
 *
 * @param {Object} graphResult - Output from TagTeam.buildGraph()
 * @returns {Object} { nodes: Array<Object>, parsingActIri: string }
 * @throws {TokenSpanCardinalityError} When tokenSpan/tokens.length mismatch (§4.6.6)
 */
function projectToRDF(graphResult) {
  const graph = graphResult['@graph'] || [];
  const md = graphResult._metadata;

  if (!md || !md.sentences) {
    return { nodes: [], parsingActIri: null };
  }

  // Find ParsingAct IRI from graph
  const parsingActNode = graph.find(n => (n['@id'] || '').includes('ParsingAct'));
  const parsingActIri = parsingActNode ? parsingActNode['@id'] : 'inst:ParsingAct_unknown';

  // Find IBE IRI from graph
  const ibeNode = graph.find(n => (n['@id'] || '').includes('Input_Text_IBE'));
  const ibeIri = ibeNode ? ibeNode['@id'] : 'inst:Input_Text_IBE_unknown';

  const nodes = [];

  // §4.6.2: ForestMetadata node
  const forestMetaIri = `${ibeIri}/forest-metadata`;
  nodes.push({
    '@id': forestMetaIri,
    '@type': 'tagteam:ForestMetadata',
  });

  // Link ParsingAct → ForestMetadata
  nodes.push({
    '@id': parsingActIri,
    'tagteam:hasMetadata': { '@id': forestMetaIri },
  });

  // §4.6.3: SentenceRecord nodes
  for (let i = 0; i < md.sentences.length; i++) {
    const sent = md.sentences[i];
    const sentIri = `${ibeIri}/sent/${i}`;

    // §4.6.6 Consistency constraint 1: tokenCount must match tokenSpan
    // Exception: parenthetical parent sentences have sentinel tokens ['(', '...', ')']
    // replacing extracted content, so tokenSpan reflects original span while tokens
    // array has the sentinel. Skip cardinality check for these.
    const tokenCount = (sent.tokens || []).length;
    const hasSentinel = (sent.tokens || []).includes('...');
    if (sent.tokenSpan && !hasSentinel) {
      const implied = sent.tokenSpan[1] - sent.tokenSpan[0] + 1;
      if (tokenCount !== implied) {
        throw new TokenSpanCardinalityError(i, tokenCount, sent.tokenSpan[0], sent.tokenSpan[1]);
      }
    }

    const sentNode = {
      '@id': sentIri,
      '@type': 'tagteam:SentenceRecord',
      'tagteam:sentenceIndex': i,
      'tagteam:tokenCount': tokenCount,
      'tagteam:segmentationType': sent.segmentationType || 'standard',
    };

    // tokenSpan decomposition
    if (sent.tokenSpan) {
      sentNode['tagteam:tokenSpanStart'] = sent.tokenSpan[0];
      sentNode['tagteam:tokenSpanEnd'] = sent.tokenSpan[1];
    }

    // firstToken (§4.6.3 — used by §6.5 SentenceRelationshipShape)
    if (sent.tokens && sent.tokens.length > 0) {
      sentNode['tagteam:firstToken'] = sent.tokens[0];
    }

    // logicalConnector: emit only when non-null (§4.6.3)
    if (sent.logicalConnector) {
      sentNode['tagteam:logicalConnector'] = sent.logicalConnector;
    }

    nodes.push(sentNode);

    // Link ForestMetadata → SentenceRecord
    nodes.push({
      '@id': forestMetaIri,
      'tagteam:hasSentence': { '@id': sentIri },
    });

    // §4.6.4: Arc nodes
    const arcs = sent.arcs || [];
    for (let j = 0; j < arcs.length; j++) {
      const arc = arcs[j];
      const arcIri = `${ibeIri}/sent/${i}/arc/${j}`;

      nodes.push({
        '@id': arcIri,
        '@type': 'tagteam:Arc',
        'tagteam:dep': arc.dep || arc.label || '',
        'tagteam:head': arc.head,         // §4.6.6: must be xsd:integer
        'tagteam:dependent': arc.dependent, // §4.6.6: must be xsd:integer
      });

      // Link SentenceRecord → Arc
      nodes.push({
        '@id': sentIri,
        'tagteam:hasArc': { '@id': arcIri },
      });
    }
  }

  // §4.6.5: SentenceRelationship nodes
  const rels = md.sentenceRelationships || [];
  for (const rel of rels) {
    const relIri = `${ibeIri}/rel/${rel.fromSentenceIndex}-${rel.toSentenceIndex}`;

    nodes.push({
      '@id': relIri,
      '@type': 'tagteam:SentenceRelationship',
      'tagteam:fromSentenceIndex': rel.fromSentenceIndex,  // §4.6.6: xsd:integer
      'tagteam:toSentenceIndex': rel.toSentenceIndex,      // §4.6.6: xsd:integer
      'tagteam:logicalConnector': rel.logicalConnector,
      'tagteam:relationshipType': rel.relationshipType,
    });

    // Link ParsingAct → SentenceRelationship
    nodes.push({
      '@id': parsingActIri,
      'tagteam:hasSentenceRelationship': { '@id': relIri },
    });
  }

  return { nodes, parsingActIri, forestMetaIri, ibeIri };
}

// ============================================================================
// Exports
// ============================================================================

module.exports = { projectToRDF, TokenSpanCardinalityError };
