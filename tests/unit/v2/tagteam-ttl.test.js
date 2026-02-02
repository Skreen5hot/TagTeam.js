/**
 * P0-TTL: tagteam-v2.ttl Schema Validation Tests
 *
 * Phase 0 — validates that the v2 OWL ontology defines all required
 * classes, properties, and individuals per v2Spec §4.
 *
 * Updated for namespace alignment: http://tagteam.fandaws.org/ontology/
 * v2 now uses the default prefix `:` and imports tagteam-core.ttl.
 * Terms already in core (DirectiveContent, Actual, Hypothetical, Prescribed,
 * Negated, corefersWith) are NOT redefined in v2.
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
 * We look for the default-prefix form (e.g. ":Inquiry") as a subject in the file.
 */
function schemaDefines(term) {
  // Match as subject of a triple (start of line or after whitespace)
  const pattern = new RegExp(`^\\s*${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s`, 'm');
  return pattern.test(schemaContent);
}

describe('P0-TTL: tagteam-v2.ttl Schema Validation', () => {

  test('P0-TTL-1: tagteam-v2.ttl parses without error (well-formed Turtle)', () => {
    expect(schemaContent.length).toBeGreaterThan(0);

    // Must have prefix declarations (now uses default prefix :)
    expect(schemaContent).toContain('@prefix : <http://tagteam.fandaws.org/ontology/>');
    expect(schemaContent).toContain('@prefix owl:');
    expect(schemaContent).toContain('@prefix rdfs:');
    expect(schemaContent).toContain('@prefix cco:');
    expect(schemaContent).toContain('@prefix skos:');

    // Must declare itself as an ontology
    expect(schemaContent).toContain('<http://tagteam.fandaws.org/ontology/v2/>');
    expect(schemaContent).toContain('a owl:Ontology');

    // Must import core
    expect(schemaContent).toContain('owl:imports <http://tagteam.fandaws.org/ontology/core/>');

    // Must have version info
    expect(schemaContent).toContain('owl:versionInfo "2.0.0"');

    // Check for balanced quotes (basic)
    const doubleQuotes = (schemaContent.match(/"/g) || []).length;
    expect(doubleQuotes % 2).toBe(0);
  });

  test('P0-TTL-2: Schema defines Speech Act classes (Inquiry, ConditionalContent, ClauseRelation)', () => {
    // Speech Act classes (DirectiveContent is now in core, not redefined here)
    expect(schemaDefines(':SpeechAct')).toBe(true);
    expect(schemaDefines(':Inquiry')).toBe(true);
    expect(schemaDefines(':ConditionalContent')).toBe(true);
    expect(schemaDefines(':ClauseRelation')).toBe(true);
    expect(schemaDefines(':ValueAssertionEvent')).toBe(true);

    // Verify class hierarchy
    expect(schemaContent).toContain(':Inquiry');
    expect(schemaContent).toContain('rdfs:subClassOf :SpeechAct');
  });

  test('P0-TTL-3: Schema defines clause relation individuals (and_then, therefore, in_order_that, contrasts_with)', () => {
    expect(schemaDefines(':and_then')).toBe(true);
    expect(schemaDefines(':therefore')).toBe(true);
    expect(schemaDefines(':in_order_that')).toBe(true);
    expect(schemaDefines(':contrasts_with')).toBe(true);
    expect(schemaDefines(':alternative_to')).toBe(true);

    // All must be NamedIndividuals
    expect(schemaContent).toContain(':and_then');
    expect(schemaContent).toContain(':therefore');
    expect(schemaContent).toContain(':in_order_that');
    expect(schemaContent).toContain(':contrasts_with');
  });

  test('P0-TTL-4: Schema defines Interrogative actuality status (others in core)', () => {
    // Interrogative is the only new actuality status in v2
    expect(schemaDefines(':Interrogative')).toBe(true);
    expect(schemaContent).toContain(':Interrogative');
    expect(schemaContent).toContain('owl:NamedIndividual');

    // Actual, Hypothetical, Prescribed, Negated are in core (imported)
    // They should NOT be redefined in v2
    expect(schemaDefines(':Actual')).toBe(false);
    expect(schemaDefines(':Hypothetical')).toBe(false);
    expect(schemaDefines(':Prescribed')).toBe(false);
    expect(schemaDefines(':Negated')).toBe(false);
  });

  test('P0-TTL-5: Schema defines clauseIndex, subjectSource, whPhrase, verbClass properties', () => {
    expect(schemaDefines(':clauseIndex')).toBe(true);
    expect(schemaDefines(':subjectSource')).toBe(true);
    expect(schemaDefines(':whPhrase')).toBe(true);
    expect(schemaDefines(':verbClass')).toBe(true);

    // Verify property types
    expect(schemaContent).toContain(':clauseIndex');
    expect(schemaContent).toContain(':subjectSource');
    expect(schemaContent).toContain(':whPhrase');
    expect(schemaContent).toContain(':verbClass');

    // Verify additional properties
    expect(schemaDefines(':epistemicStatus')).toBe(true);
    expect(schemaDefines(':isQuestionFocus')).toBe(true);
    expect(schemaDefines(':structuralAmbiguity')).toBe(true);

    // corefersWith is in core (imported), not redefined in v2
    expect(schemaDefines(':corefersWith')).toBe(false);

    // Object properties for clause relations
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

  // Temporal relations (needed by Phase 3)
  test('P0-TTL-EXTRA: Schema defines temporal relation individuals', () => {
    expect(schemaDefines(':precedes')).toBe(true);
    expect(schemaDefines(':follows')).toBe(true);
    expect(schemaDefines(':simultaneous_with')).toBe(true);

    expect(schemaContent).toContain(':precedes');
    expect(schemaContent).toContain(':follows');
    expect(schemaContent).toContain(':simultaneous_with');
  });
});

printSummary();
