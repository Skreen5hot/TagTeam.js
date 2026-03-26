/**
 * P0-TTL: tagteam.ttl Schema Validation Tests
 *
 * Phase 0 — validates that the unified TagTeam ontology defines all required
 * classes, properties, and individuals from core, v2, and v3.
 *
 * Namespace: http://tagteam.fandaws.org/ontology/
 * Single authoritative file consolidating core + structural + BFO bridges.
 *
 * Test IDs: P0-TTL-1 through P0-TTL-7
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { describe, test, expect, printSummary } = require('../../framework/test-helpers');

const SCHEMA_PATH = path.join(__dirname, '..', '..', '..', 'ontology', 'tagteam.ttl');

// Load schema content once
const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');

/**
 * Helper: check that a TTL file contains a declaration for a given IRI fragment.
 * We look for the default-prefix form (e.g. ":Inquiry") as a subject in the file.
 */
function schemaDefines(term) {
  // Match as subject of a triple (start of line or after whitespace)
  const pattern = new RegExp(`^\\s*${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s`, 'm');
  return pattern.test(schemaContent);
}

describe('P0-TTL: tagteam.ttl Schema Validation', () => {

  test('P0-TTL-1: tagteam.ttl parses without error (well-formed Turtle)', () => {
    expect(schemaContent.length).toBeGreaterThan(0);

    // Must have prefix declarations
    expect(schemaContent).toContain('@prefix : <http://tagteam.fandaws.org/ontology/>');
    expect(schemaContent).toContain('@prefix owl:');
    expect(schemaContent).toContain('@prefix rdfs:');
    expect(schemaContent).toContain('@prefix cco:');
    expect(schemaContent).toContain('@prefix skos:');

    // Must declare itself as an ontology
    expect(schemaContent).toContain('<http://tagteam.fandaws.org/ontology/>');
    expect(schemaContent).toContain('a owl:Ontology');

    // Must have version info
    expect(schemaContent).toContain('owl:versionInfo "4.1.0"');

    // Check for balanced quotes (basic)
    const doubleQuotes = (schemaContent.match(/"/g) || []).length;
    expect(doubleQuotes % 2).toBe(0);
  });

  test('P0-TTL-2: Schema defines Tier 1 parsing classes (DiscourseReferent, VerbPhrase, DeonticContent)', () => {
    expect(schemaDefines(':DiscourseReferent')).toBe(true);
    expect(schemaDefines(':VerbPhrase')).toBe(true);
    expect(schemaDefines(':DeonticContent')).toBe(true);
    expect(schemaDefines(':DirectiveContent')).toBe(true);
    expect(schemaDefines(':ScarcityAssertion')).toBe(true);
    expect(schemaDefines(':InterpretationContext')).toBe(true);
  });

  test('P0-TTL-3: Schema defines Speech Act classes (Inquiry, ConditionalContent, ClauseRelation)', () => {
    expect(schemaDefines(':SpeechAct')).toBe(true);
    expect(schemaDefines(':Inquiry')).toBe(true);
    expect(schemaDefines(':ConditionalContent')).toBe(true);
    expect(schemaDefines(':ClauseRelation')).toBe(true);

    // Verify class hierarchy
    expect(schemaContent).toContain(':Inquiry');
    expect(schemaContent).toContain('rdfs:subClassOf :SpeechAct');
  });

  test('P0-TTL-4: Schema defines actuality status individuals (Actual through Interrogative)', () => {
    expect(schemaDefines(':ActualityStatus')).toBe(true);
    expect(schemaDefines(':Actual')).toBe(true);
    expect(schemaDefines(':Prescribed')).toBe(true);
    expect(schemaDefines(':Permitted')).toBe(true);
    expect(schemaDefines(':Prohibited')).toBe(true);
    expect(schemaDefines(':Hypothetical')).toBe(true);
    expect(schemaDefines(':Planned')).toBe(true);
    expect(schemaDefines(':Negated')).toBe(true);
    expect(schemaDefines(':Interrogative')).toBe(true);

    // All must be NamedIndividuals
    expect(schemaContent).toContain('owl:NamedIndividual');
  });

  test('P0-TTL-5: Schema defines clause relation individuals and properties', () => {
    // Clause relation individuals
    expect(schemaDefines(':and_then')).toBe(true);
    expect(schemaDefines(':therefore')).toBe(true);
    expect(schemaDefines(':in_order_that')).toBe(true);
    expect(schemaDefines(':contrasts_with')).toBe(true);
    expect(schemaDefines(':alternative_to')).toBe(true);

    // Temporal relations
    expect(schemaDefines(':precedes')).toBe(true);
    expect(schemaDefines(':follows')).toBe(true);
    expect(schemaDefines(':simultaneous_with')).toBe(true);

    // Clause properties
    expect(schemaDefines(':clauseIndex')).toBe(true);
    expect(schemaDefines(':subjectSource')).toBe(true);
    expect(schemaDefines(':whPhrase')).toBe(true);
    expect(schemaDefines(':verbClass')).toBe(true);
    expect(schemaDefines(':epistemicStatus')).toBe(true);
    expect(schemaDefines(':isQuestionFocus')).toBe(true);

    // Clause object properties
    expect(schemaDefines(':relationType')).toBe(true);
    expect(schemaDefines(':fromClause')).toBe(true);
    expect(schemaDefines(':toClause')).toBe(true);
    expect(schemaDefines(':has_antecedent')).toBe(true);
    expect(schemaDefines(':has_consequent')).toBe(true);
    expect(schemaDefines(':has_cause')).toBe(true);

    // Annotation property
    expect(schemaContent).toContain(':structuralAmbiguity');
    expect(schemaContent).toContain('owl:AnnotationProperty');
  });

  test('P0-TTL-6: Schema defines v3 additions (StructuralAssertion, ontologyMatch, BFO bridges)', () => {
    // FT-03 Structural Assertions
    expect(schemaDefines(':StructuralAssertion')).toBe(true);
    expect(schemaDefines(':NegatedStructuralAssertion')).toBe(true);
    expect(schemaDefines(':assertionSubject')).toBe(true);
    expect(schemaDefines(':assertionObject')).toBe(true);
    expect(schemaDefines(':assertedRelation')).toBe(true);

    // BFO bridge properties
    expect(schemaDefines(':has_function')).toBe(true);
    expect(schemaDefines(':supersedes')).toBe(true);
    expect(schemaDefines(':has_start_time')).toBe(true);
    expect(schemaDefines(':has_end_time')).toBe(true);

    // scopeNote documentation
    expect(schemaContent).toContain('skos:scopeNote');

    // Ontology match annotations
    expect(schemaDefines(':ontologyMatch')).toBe(true);
    expect(schemaDefines(':ontologyMatchIRI')).toBe(true);
    expect(schemaDefines(':ontologyMatchConfidence')).toBe(true);
    expect(schemaDefines(':ontologyMatchEvidence')).toBe(true);
    expect(schemaDefines(':ontologyMatchLabel')).toBe(true);
    expect(schemaDefines(':ontologyMatchType')).toBe(true);
    expect(schemaDefines(':ontologyMatchForm')).toBe(true);
    expect(schemaDefines(':ontologyMatchInflection')).toBe(true);
  });

  test('P0-TTL-7: Schema does NOT define removed values classes', () => {
    // Values classes removed in v4.0.0
    expect(schemaDefines(':ValueAssertionEvent')).toBe(false);
    expect(schemaDefines(':ContextAssessmentEvent')).toBe(false);
    expect(schemaDefines(':EthicalValueICE')).toBe(false);
    expect(schemaDefines(':ContextDimensionICE')).toBe(false);
    expect(schemaDefines(':ValueDetectionRecord')).toBe(false);
    expect(schemaDefines(':ContextAssessmentRecord')).toBe(false);
    expect(schemaDefines(':AssertionType')).toBe(false);
    expect(schemaDefines(':AutomatedDetection')).toBe(false);
    expect(schemaDefines(':HumanValidation')).toBe(false);
    expect(schemaDefines(':HumanRejection')).toBe(false);
    expect(schemaDefines(':HumanCorrection')).toBe(false);
  });
});

printSummary();
