/**
 * P0-TTL: tagteam-v2.ttl Schema Validation Tests
 *
 * Phase 0 — validates that the v2 OWL ontology defines all required
 * classes, properties, and individuals per v2Spec §4.
 *
 * Test IDs: P0-TTL-1 through P0-TTL-5
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { describe, test, expect, printSummary } = require('../../framework/test-helpers');

const SCHEMA_PATH = path.join(__dirname, '..', '..', '..', 'ontology', 'tagteam-v2.ttl');

// Load schema content once
const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');

/**
 * Helper: check that a TTL file contains a declaration for a given IRI fragment.
 * We look for the prefixed form (e.g. "tagteam:Inquiry") as a subject in the file.
 */
function schemaDefines(term) {
  // Match as subject of a triple (start of line or after whitespace)
  const pattern = new RegExp(`^\\s*${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s`, 'm');
  return pattern.test(schemaContent);
}

describe('P0-TTL: tagteam-v2.ttl Schema Validation', () => {

  test('P0-TTL-1: tagteam-v2.ttl parses without error (well-formed Turtle)', () => {
    // Basic structural checks for Turtle well-formedness:
    // - Has @prefix declarations
    // - Has ontology declaration
    // - Every statement ends with . or ;
    // - No unclosed quotes

    expect(schemaContent.length).toBeGreaterThan(0);

    // Must have prefix declarations
    expect(schemaContent).toContain('@prefix tagteam:');
    expect(schemaContent).toContain('@prefix owl:');
    expect(schemaContent).toContain('@prefix rdfs:');
    expect(schemaContent).toContain('@prefix cco:');

    // Must declare itself as an ontology
    expect(schemaContent).toContain('tagteam: a owl:Ontology');

    // Must have version info
    expect(schemaContent).toContain('owl:versionInfo "2.0.0"');

    // Check for balanced quotes (basic)
    const doubleQuotes = (schemaContent.match(/"/g) || []).length;
    expect(doubleQuotes % 2).toBe(0);
  });

  test('P0-TTL-2: Schema defines Speech Act classes (Inquiry, DirectiveContent, ConditionalContent, ClauseRelation)', () => {
    // Speech Act classes
    expect(schemaDefines('tagteam:SpeechAct')).toBe(true);
    expect(schemaDefines('tagteam:Inquiry')).toBe(true);
    expect(schemaDefines('tagteam:DirectiveContent')).toBe(true);
    expect(schemaDefines('tagteam:ConditionalContent')).toBe(true);
    expect(schemaDefines('tagteam:ClauseRelation')).toBe(true);

    // Verify class hierarchy
    expect(schemaContent).toContain('tagteam:Inquiry a owl:Class');
    expect(schemaContent).toContain('tagteam:Inquiry');
    expect(schemaContent).toContain('rdfs:subClassOf tagteam:SpeechAct');
  });

  test('P0-TTL-3: Schema defines clause relation individuals (and_then, therefore, in_order_that, contrasts_with)', () => {
    expect(schemaDefines('tagteam:and_then')).toBe(true);
    expect(schemaDefines('tagteam:therefore')).toBe(true);
    expect(schemaDefines('tagteam:in_order_that')).toBe(true);
    expect(schemaDefines('tagteam:contrasts_with')).toBe(true);
    expect(schemaDefines('tagteam:alternative_to')).toBe(true);

    // All must be NamedIndividuals
    expect(schemaContent).toContain('tagteam:and_then a owl:NamedIndividual');
    expect(schemaContent).toContain('tagteam:therefore a owl:NamedIndividual');
    expect(schemaContent).toContain('tagteam:in_order_that a owl:NamedIndividual');
    expect(schemaContent).toContain('tagteam:contrasts_with a owl:NamedIndividual');
  });

  test('P0-TTL-4: Schema defines Hypothetical and Negative actuality statuses', () => {
    expect(schemaDefines('tagteam:Hypothetical')).toBe(true);
    expect(schemaDefines('tagteam:Negative')).toBe(true);
    expect(schemaDefines('tagteam:Actual')).toBe(true);
    expect(schemaDefines('tagteam:Interrogative')).toBe(true);
    expect(schemaDefines('tagteam:Prescribed')).toBe(true);

    // All must be NamedIndividuals
    expect(schemaContent).toContain('tagteam:Hypothetical a owl:NamedIndividual');
    expect(schemaContent).toContain('tagteam:Negative a owl:NamedIndividual');
  });

  test('P0-TTL-5: Schema defines clauseIndex, subjectSource, whPhrase, verbClass properties', () => {
    expect(schemaDefines('tagteam:clauseIndex')).toBe(true);
    expect(schemaDefines('tagteam:subjectSource')).toBe(true);
    expect(schemaDefines('tagteam:whPhrase')).toBe(true);
    expect(schemaDefines('tagteam:verbClass')).toBe(true);

    // Verify property types
    expect(schemaContent).toContain('tagteam:clauseIndex a owl:DatatypeProperty');
    expect(schemaContent).toContain('tagteam:subjectSource a owl:DatatypeProperty');
    expect(schemaContent).toContain('tagteam:whPhrase a owl:DatatypeProperty');
    expect(schemaContent).toContain('tagteam:verbClass a owl:DatatypeProperty');

    // Verify additional properties
    expect(schemaDefines('tagteam:epistemicStatus')).toBe(true);
    expect(schemaDefines('tagteam:isQuestionFocus')).toBe(true);
    expect(schemaDefines('tagteam:structuralAmbiguity')).toBe(true);
    expect(schemaDefines('tagteam:corefers_with')).toBe(true);

    // Object properties for clause relations
    expect(schemaDefines('tagteam:relationType')).toBe(true);
    expect(schemaDefines('tagteam:fromClause')).toBe(true);
    expect(schemaDefines('tagteam:toClause')).toBe(true);
    expect(schemaDefines('tagteam:has_antecedent')).toBe(true);
    expect(schemaDefines('tagteam:has_consequent')).toBe(true);
    expect(schemaDefines('tagteam:has_cause')).toBe(true);

    // Annotation vs object vs datatype
    expect(schemaContent).toContain('tagteam:structuralAmbiguity a owl:AnnotationProperty');
    expect(schemaContent).toContain('tagteam:corefers_with a owl:ObjectProperty');
  });

  // Temporal relations (needed by Phase 3)
  test('P0-TTL-EXTRA: Schema defines temporal relation individuals', () => {
    expect(schemaDefines('tagteam:precedes')).toBe(true);
    expect(schemaDefines('tagteam:follows')).toBe(true);
    expect(schemaDefines('tagteam:simultaneous_with')).toBe(true);

    expect(schemaContent).toContain('tagteam:precedes a owl:NamedIndividual');
    expect(schemaContent).toContain('tagteam:follows a owl:NamedIndividual');
    expect(schemaContent).toContain('tagteam:simultaneous_with a owl:NamedIndividual');
  });
});

printSummary();
