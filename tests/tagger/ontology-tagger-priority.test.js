'use strict';

/**
 * OntologyTextTagger Priority Matching Tests
 * Tests Sections A–H, Negative, Disambiguation, and Compound from the test guide.
 */

const fs = require('fs');
const path = require('path');
const OntologyTextTagger = require('../../src/ontology/OntologyTextTagger.js');

const ttlPath = path.join(__dirname, 'test-ontology.ttl');
const ttl = fs.readFileSync(ttlPath, 'utf8');

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(message);
    console.log('  FAIL: ' + message);
  }
}

function findMatch(results, classId) {
  return results.find(r => r['class'] === classId || r.iri === classId);
}

// Create tagger in priority mode (no custom keyword property)
const tagger = OntologyTextTagger.fromTTL(ttl);

console.log('=== OntologyTextTagger Priority Matching Tests ===\n');
console.log('Loaded:', tagger.tagDefinitions.length, 'definitions');
console.log('Match mode:', tagger._matchMode);
console.log('');

// ═══════════════════════════════════════════════════════════════
// Section A: Exact Match (rdfs:label, skos:prefLabel)
// ═══════════════════════════════════════════════════════════════
console.log('--- Section A: Exact Match ---');

// TC-01: Exact multi-token rdfs:label
(function TC01() {
  var r = tagger.tagText('Department of Homeland Security');
  var m = findMatch(r, 'ex:DepartmentOfHomelandSecurity');
  assert(m, 'TC-01: DHS matched via rdfs:label');
  assert(m && m.ontologyMatchType === 'exact', 'TC-01: matchType is exact');
  assert(m && m.ontologyMatchInflection === null, 'TC-01: inflection is null');
})();

// TC-01a: Exact (lowercase)
(function TC01a() {
  var r = tagger.tagText('department of homeland security');
  var m = findMatch(r, 'ex:DepartmentOfHomelandSecurity');
  assert(m, 'TC-01a: DHS matched lowercase');
  assert(m && m.ontologyMatchType === 'exact', 'TC-01a: matchType is exact');
})();

// TC-02: Exact multi-token skos:prefLabel
(function TC02() {
  var r = tagger.tagText('U.S. Homeland Security Department');
  var m = findMatch(r, 'ex:DepartmentOfHomelandSecurity');
  assert(m, 'TC-02: DHS matched via skos:prefLabel');
  assert(m && m.ontologyMatchType === 'exact', 'TC-02: matchType is exact');
})();

// TC-02a: Exact (lowercase)
(function TC02a() {
  var r = tagger.tagText('u.s. homeland security department');
  var m = findMatch(r, 'ex:DepartmentOfHomelandSecurity');
  assert(m, 'TC-02a: DHS prefLabel matched lowercase');
  assert(m && m.ontologyMatchType === 'exact', 'TC-02a: matchType is exact');
})();

// TC-19: Exact rdfs:label simple
(function TC19() {
  var r = tagger.tagText('Radio');
  var m = findMatch(r, 'ex:Radio');
  assert(m, 'TC-19: Radio matched');
  assert(m && m.ontologyMatchType === 'exact', 'TC-19: matchType is exact');
  assert(m && m.ontologyMatchInflection === null, 'TC-19: inflection is null');
})();

// TC-19a: Exact lowercase
(function TC19a() {
  var r = tagger.tagText('radio');
  var m = findMatch(r, 'ex:Radio');
  assert(m, 'TC-19a: radio matched lowercase');
  assert(m && m.ontologyMatchType === 'exact', 'TC-19a: matchType is exact');
})();

// TC-20: Exact hyphenated skos:prefLabel
(function TC20() {
  var r = tagger.tagText('Walkie-Talkie');
  var m = findMatch(r, 'ex:WalkieTalkie');
  assert(m, 'TC-20: Walkie-Talkie matched');
  assert(m && m.ontologyMatchType === 'exact', 'TC-20: matchType is exact');
})();

// TC-20a: Exact lowercase hyphenated
(function TC20a() {
  var r = tagger.tagText('walkie-talkie');
  var m = findMatch(r, 'ex:WalkieTalkie');
  assert(m, 'TC-20a: walkie-talkie matched lowercase');
  assert(m && m.ontologyMatchType === 'exact', 'TC-20a: matchType is exact');
})();

// ═══════════════════════════════════════════════════════════════
// Section B: Alias Match (skos:altLabel, skos:notation)
// ═══════════════════════════════════════════════════════════════
console.log('--- Section B: Alias Match ---');

// TC-03: Alias acronym
(function TC03() {
  var r = tagger.tagText('DHS');
  var m = findMatch(r, 'ex:DepartmentOfHomelandSecurity');
  assert(m, 'TC-03: DHS matched via skos:altLabel');
  assert(m && m.ontologyMatchType === 'alias', 'TC-03: matchType is alias');
  assert(m && m.ontologyMatchInflection === null, 'TC-03: inflection is null');
})();

// TC-03a: Alias lowercase
(function TC03a() {
  var r = tagger.tagText('dhs');
  var m = findMatch(r, 'ex:DepartmentOfHomelandSecurity');
  assert(m, 'TC-03a: dhs matched lowercase');
  assert(m && m.ontologyMatchType === 'alias', 'TC-03a: matchType is alias');
})();

// TC-04: Alias notation
(function TC04() {
  var r = tagger.tagText('HS-DEP');
  var m = findMatch(r, 'ex:DepartmentOfHomelandSecurity');
  assert(m, 'TC-04: HS-DEP matched via skos:notation');
  assert(m && m.ontologyMatchType === 'alias', 'TC-04: matchType is alias');
})();

// TC-04a: Alias notation lowercase
(function TC04a() {
  var r = tagger.tagText('hs-dep');
  var m = findMatch(r, 'ex:DepartmentOfHomelandSecurity');
  assert(m, 'TC-04a: hs-dep matched lowercase');
  assert(m && m.ontologyMatchType === 'alias', 'TC-04a: matchType is alias');
})();

// ═══════════════════════════════════════════════════════════════
// Section C: Lemma Match — Regular Plurals
// ═══════════════════════════════════════════════════════════════
console.log('--- Section C: Lemma Match — Regular Plurals ---');

// TC-05: agents → agent → Agent
(function TC05() {
  var r = tagger.tagText('Agents');
  var m = findMatch(r, 'ex:Agent');
  assert(m, 'TC-05: Agents matched ex:Agent');
  assert(m && m.ontologyMatchType === 'lemma', 'TC-05: matchType is lemma');
  assert(m && m.ontologyMatchInflection === 'plural→singular', 'TC-05: inflection is plural→singular');
})();

// TC-05a: lowercase
(function TC05a() {
  var r = tagger.tagText('agents');
  var m = findMatch(r, 'ex:Agent');
  assert(m, 'TC-05a: agents matched ex:Agent');
  assert(m && m.ontologyMatchType === 'lemma', 'TC-05a: matchType is lemma');
  assert(m && m.ontologyMatchInflection === 'plural→singular', 'TC-05a: inflection is plural→singular');
})();

// TC-06: operatives → operative → Operative
(function TC06() {
  var r = tagger.tagText('Operatives');
  var m = findMatch(r, 'ex:Operative');
  assert(m, 'TC-06: Operatives matched ex:Operative');
  assert(m && m.ontologyMatchType === 'lemma', 'TC-06: matchType is lemma');
  assert(m && m.ontologyMatchInflection === 'plural→singular', 'TC-06: inflection is plural→singular');
})();

// TC-06a: lowercase
(function TC06a() {
  var r = tagger.tagText('operatives');
  var m = findMatch(r, 'ex:Operative');
  assert(m, 'TC-06a: operatives matched ex:Operative');
  assert(m && m.ontologyMatchType === 'lemma', 'TC-06a: matchType is lemma');
})();

// TC-15: dogs → dog → Dog
(function TC15() {
  var r = tagger.tagText('dogs');
  var m = findMatch(r, 'ex:Dog');
  assert(m, 'TC-15: dogs matched ex:Dog');
  assert(m && m.ontologyMatchType === 'lemma', 'TC-15: matchType is lemma');
  assert(m && m.ontologyMatchInflection === 'plural→singular', 'TC-15: inflection is plural→singular');
})();

// TC-15a: DOGS uppercase
(function TC15a() {
  var r = tagger.tagText('DOGS');
  var m = findMatch(r, 'ex:Dog');
  assert(m, 'TC-15a: DOGS matched ex:Dog');
  assert(m && m.ontologyMatchType === 'lemma', 'TC-15a: matchType is lemma');
})();

// TC-16: wolves → wolf → Wolf
(function TC16() {
  var r = tagger.tagText('wolves');
  var m = findMatch(r, 'ex:Wolf');
  assert(m, 'TC-16: wolves matched ex:Wolf');
  assert(m && m.ontologyMatchType === 'lemma', 'TC-16: matchType is lemma');
})();

// TC-16a: WOLVES uppercase
(function TC16a() {
  var r = tagger.tagText('WOLVES');
  var m = findMatch(r, 'ex:Wolf');
  assert(m, 'TC-16a: WOLVES matched ex:Wolf');
  assert(m && m.ontologyMatchType === 'lemma', 'TC-16a: matchType is lemma');
})();

// ═══════════════════════════════════════════════════════════════
// Section D: Irregular Plurals
// ═══════════════════════════════════════════════════════════════
console.log('--- Section D: Irregular Plurals ---');

// TC-11: "Criteria" is exact match on rdfs:label "Criteria"
(function TC11() {
  var r = tagger.tagText('Criteria');
  var m = findMatch(r, 'ex:Criterion');
  assert(m, 'TC-11: Criteria matched ex:Criterion');
  assert(m && m.ontologyMatchType === 'exact', 'TC-11: matchType is exact');
  assert(m && m.ontologyMatchInflection === null, 'TC-11: inflection is null');
})();

// TC-11a: lowercase
(function TC11a() {
  var r = tagger.tagText('criteria');
  var m = findMatch(r, 'ex:Criterion');
  assert(m, 'TC-11a: criteria matched ex:Criterion');
  assert(m && m.ontologyMatchType === 'exact', 'TC-11a: matchType is exact');
})();

// TC-11b: "Criterion" (singular) — bidirectional irregular lemma
(function TC11b() {
  var r = tagger.tagText('Criterion');
  var m = findMatch(r, 'ex:Criterion');
  assert(m, 'TC-11b: Criterion matched ex:Criterion via lemma');
  assert(m && m.ontologyMatchType === 'lemma', 'TC-11b: matchType is lemma');
  assert(m && m.ontologyMatchInflection === 'irregular', 'TC-11b: inflection is irregular');
})();

// TC-12: "Phenomena" is exact match on skos:prefLabel "Phenomena"
(function TC12() {
  var r = tagger.tagText('Phenomena');
  var m = findMatch(r, 'ex:Phenomenon');
  assert(m, 'TC-12: Phenomena matched ex:Phenomenon');
  assert(m && m.ontologyMatchType === 'exact', 'TC-12: matchType is exact');
})();

// TC-12a: lowercase
(function TC12a() {
  var r = tagger.tagText('phenomena');
  var m = findMatch(r, 'ex:Phenomenon');
  assert(m, 'TC-12a: phenomena matched ex:Phenomenon');
  assert(m && m.ontologyMatchType === 'exact', 'TC-12a: matchType is exact');
})();

// TC-12b: "Phenomenon" (singular) — bidirectional irregular lemma
(function TC12b() {
  var r = tagger.tagText('Phenomenon');
  var m = findMatch(r, 'ex:Phenomenon');
  assert(m, 'TC-12b: Phenomenon matched ex:Phenomenon via lemma');
  assert(m && m.ontologyMatchType === 'lemma', 'TC-12b: matchType is lemma');
  assert(m && m.ontologyMatchInflection === 'irregular', 'TC-12b: inflection is irregular');
})();

// ═══════════════════════════════════════════════════════════════
// Section E: Verb Inflection
// ═══════════════════════════════════════════════════════════════
console.log('--- Section E: Verb Inflection ---');

// TC-13: "Running" exact match on rdfs:label
(function TC13() {
  var r = tagger.tagText('Running');
  var m = findMatch(r, 'ex:RunningAct');
  assert(m, 'TC-13: Running matched ex:RunningAct');
  assert(m && m.ontologyMatchType === 'exact', 'TC-13: matchType is exact');
  assert(m && m.ontologyMatchInflection === null, 'TC-13: inflection is null');
})();

// TC-13a: lowercase
(function TC13a() {
  var r = tagger.tagText('running');
  var m = findMatch(r, 'ex:RunningAct');
  assert(m, 'TC-13a: running matched ex:RunningAct');
  assert(m && m.ontologyMatchType === 'exact', 'TC-13a: matchType is exact');
})();

// TC-13b: "Runs" → run; "Running" → run via lemma
(function TC13b() {
  var r = tagger.tagText('Runs');
  var m = findMatch(r, 'ex:RunningAct');
  assert(m, 'TC-13b: Runs matched ex:RunningAct via lemma');
  assert(m && m.ontologyMatchType === 'lemma', 'TC-13b: matchType is lemma');
  assert(m && m.ontologyMatchInflection === 'verb→base', 'TC-13b: inflection is verb→base');
})();

// TC-13c: "Ran" → run (irregular verb)
(function TC13c() {
  var r = tagger.tagText('Ran');
  var m = findMatch(r, 'ex:RunningAct');
  assert(m, 'TC-13c: Ran matched ex:RunningAct via lemma');
  assert(m && m.ontologyMatchType === 'lemma', 'TC-13c: matchType is lemma');
})();

// TC-14: "Swimming" exact match on skos:prefLabel
(function TC14() {
  var r = tagger.tagText('Swimming');
  var m = findMatch(r, 'ex:SwimmingAct');
  assert(m, 'TC-14: Swimming matched ex:SwimmingAct');
  assert(m && m.ontologyMatchType === 'exact', 'TC-14: matchType is exact');
})();

// TC-14a: lowercase
(function TC14a() {
  var r = tagger.tagText('swimming');
  var m = findMatch(r, 'ex:SwimmingAct');
  assert(m, 'TC-14a: swimming matched ex:SwimmingAct');
  assert(m && m.ontologyMatchType === 'exact', 'TC-14a: matchType is exact');
})();

// TC-14b: "Swam" → swim; "Swimming" → swim
(function TC14b() {
  var r = tagger.tagText('Swam');
  var m = findMatch(r, 'ex:SwimmingAct');
  assert(m, 'TC-14b: Swam matched ex:SwimmingAct via lemma');
  assert(m && m.ontologyMatchType === 'lemma', 'TC-14b: matchType is lemma');
})();

// TC-14c: "Swims" → swim
(function TC14c() {
  var r = tagger.tagText('Swims');
  var m = findMatch(r, 'ex:SwimmingAct');
  assert(m, 'TC-14c: Swims matched ex:SwimmingAct via lemma');
  assert(m && m.ontologyMatchType === 'lemma', 'TC-14c: matchType is lemma');
})();

// ═══════════════════════════════════════════════════════════════
// Section F: Possessive Stripping
// ═══════════════════════════════════════════════════════════════
console.log('--- Section F: Possessive Stripping ---');

// TC-17: "Smith's" → Smith
(function TC17() {
  var r = tagger.tagText("Smith's report was filed.");
  var m = findMatch(r, 'ex:Smith_001');
  assert(m, "TC-17: Smith's matched ex:Smith_001");
  assert(m && m.ontologyMatchType === 'exact', 'TC-17: matchType is exact');
  assert(m && m.ontologyMatchInflection === 'possessive→base', 'TC-17: inflection is possessive→base');
})();

// TC-17a: lowercase
(function TC17a() {
  var r = tagger.tagText("smith's report was filed.");
  var m = findMatch(r, 'ex:Smith_001');
  assert(m, "TC-17a: smith's matched ex:Smith_001");
  assert(m && m.ontologyMatchType === 'exact', 'TC-17a: matchType is exact');
  assert(m && m.ontologyMatchInflection === 'possessive→base', 'TC-17a: inflection is possessive→base');
})();

// TC-18: "Jones'" → Jones
(function TC18() {
  var r = tagger.tagText("Jones' file was reviewed.");
  var m = findMatch(r, 'ex:Jones_001');
  assert(m, "TC-18: Jones' matched ex:Jones_001");
  assert(m && m.ontologyMatchType === 'exact', 'TC-18: matchType is exact');
  assert(m && m.ontologyMatchInflection === 'possessive→base', 'TC-18: inflection is possessive→base');
})();

// TC-18a: lowercase
(function TC18a() {
  var r = tagger.tagText("jones' file was reviewed.");
  var m = findMatch(r, 'ex:Jones_001');
  assert(m, "TC-18a: jones' matched ex:Jones_001");
  assert(m && m.ontologyMatchType === 'exact', 'TC-18a: matchType is exact');
  assert(m && m.ontologyMatchInflection === 'possessive→base', 'TC-18a: inflection is possessive→base');
})();

// ═══════════════════════════════════════════════════════════════
// Section G: Possessive + Compound Normalization
// ═══════════════════════════════════════════════════════════════
console.log('--- Section G: Possessive + Compound ---');

// TC-07: "Children's" → strip → "Children" → exact on skos:altLabel
(function TC07() {
  var r = tagger.tagText("Children's books are popular.");
  var m = findMatch(r, 'ex:Child');
  assert(m, "TC-07: Children's matched ex:Child");
  assert(m && m.ontologyMatchType === 'alias', 'TC-07: matchType is alias');
  assert(m && m.ontologyMatchInflection === 'possessive→base', 'TC-07: inflection is possessive→base');
})();

// TC-07a: lowercase
(function TC07a() {
  var r = tagger.tagText("children's books are popular.");
  var m = findMatch(r, 'ex:Child');
  assert(m, "TC-07a: children's matched ex:Child");
  assert(m && m.ontologyMatchType === 'alias', 'TC-07a: matchType is alias');
  assert(m && m.ontologyMatchInflection === 'possessive→base', 'TC-07a: inflection is possessive→base');
})();

// TC-08: "Kids'" → strip → "Kids" → lemma → "kid" → "Kid'" notation lemma "kid"
(function TC08() {
  var r = tagger.tagText("Kids' meals are available.");
  var m = findMatch(r, 'ex:Kid');
  assert(m, "TC-08: Kids' matched ex:Kid");
  assert(m && m.ontologyMatchType === 'alias', 'TC-08: matchType is alias');
  assert(m && m.ontologyMatchInflection === 'possessive→base', 'TC-08: inflection is possessive→base');
})();

// TC-08a: lowercase
(function TC08a() {
  var r = tagger.tagText("kids' meals are available.");
  var m = findMatch(r, 'ex:Kid');
  assert(m, "TC-08a: kids' matched ex:Kid");
  assert(m && m.ontologyMatchType === 'alias', 'TC-08a: matchType is alias');
  assert(m && m.ontologyMatchInflection === 'possessive→base', 'TC-08a: inflection is possessive→base');
})();

// ═══════════════════════════════════════════════════════════════
// Section H: Hidden Label / Typo Match
// ═══════════════════════════════════════════════════════════════
console.log('--- Section H: Hidden Label Match ---');

// TC-09: "Homland Security" typo match
(function TC09() {
  var r = tagger.tagText('Homland Security');
  var m = findMatch(r, 'ex:DepartmentOfHomelandSecurity');
  assert(m, 'TC-09: Homland Security matched via hiddenLabel');
  assert(m && m.ontologyMatchType === 'hidden', 'TC-09: matchType is hidden');
  assert(m && m.ontologyMatchInflection === null, 'TC-09: inflection is null');
})();

// TC-09a: lowercase
(function TC09a() {
  var r = tagger.tagText('homland security');
  var m = findMatch(r, 'ex:DepartmentOfHomelandSecurity');
  assert(m, 'TC-09a: homland security matched');
  assert(m && m.ontologyMatchType === 'hidden', 'TC-09a: matchType is hidden');
})();

// TC-10: "Dept of Homeland Securty" typo match
(function TC10() {
  var r = tagger.tagText('Dept of Homeland Securty');
  var m = findMatch(r, 'ex:DepartmentOfHomelandSecurity');
  assert(m, 'TC-10: Dept of Homeland Securty matched via hiddenLabel');
  assert(m && m.ontologyMatchType === 'hidden', 'TC-10: matchType is hidden');
})();

// TC-10a: lowercase
(function TC10a() {
  var r = tagger.tagText('dept of homeland securty');
  var m = findMatch(r, 'ex:DepartmentOfHomelandSecurity');
  assert(m, 'TC-10a: dept of homeland securty matched');
  assert(m && m.ontologyMatchType === 'hidden', 'TC-10a: matchType is hidden');
})();

// ═══════════════════════════════════════════════════════════════
// Negative Tests
// ═══════════════════════════════════════════════════════════════
console.log('--- Negative Tests ---');

// TC-N01: Unknown term
(function TCN01() {
  var r = tagger.tagText('Xylophone');
  assert(r.length === 0, 'TC-N01: Xylophone produces no matches');
})();

// TC-N02: Substring of "Agent" — must not match
(function TCN02() {
  var r = tagger.tagText('ant');
  var m = findMatch(r, 'ex:Agent');
  assert(!m, 'TC-N02: "ant" does not substring-match "Agent"');
})();

// TC-N03: Partial acronym
(function TCN03() {
  var r = tagger.tagText('HS');
  var m = findMatch(r, 'ex:DepartmentOfHomelandSecurity');
  assert(!m, 'TC-N03: "HS" does not match DHS');
})();

// TC-N04: Substring of "Agent" / "Agency"
(function TCN04() {
  var r = tagger.tagText('age');
  var m = findMatch(r, 'ex:Agent');
  assert(!m, 'TC-N04: "age" does not match Agent');
})();

// TC-N05: Substring of "Walkie-Talkie"
(function TCN05() {
  var r = tagger.tagText('walk');
  var m = findMatch(r, 'ex:WalkieTalkie');
  assert(!m, 'TC-N05: "walk" does not match Walkie-Talkie');
})();

// TC-N06: Substring of "Department"
(function TCN06() {
  var r = tagger.tagText('Depart');
  var m = findMatch(r, 'ex:DepartmentOfHomelandSecurity');
  assert(!m, 'TC-N06: "Depart" does not match DHS');
})();

// TC-N07: "Securities" should not match DHS
(function TCN07() {
  var r = tagger.tagText('Securities');
  var m = findMatch(r, 'ex:DepartmentOfHomelandSecurity');
  assert(!m, 'TC-N07: "Securities" does not create false bridge to DHS');
})();

// ═══════════════════════════════════════════════════════════════
// Disambiguation Tests
// ═══════════════════════════════════════════════════════════════
console.log('--- Disambiguation Tests ---');

// TC-D01: "Agent" matches only ex:Agent
(function TCD01() {
  var r = tagger.tagText('Agent');
  var m1 = findMatch(r, 'ex:Agent');
  var m2 = findMatch(r, 'ex:Operative');
  assert(m1, 'TC-D01: Agent matches ex:Agent');
  assert(!m2, 'TC-D01: Agent does not match ex:Operative');
})();

// TC-D02: "Children" matches only ex:Child
(function TCD02() {
  var r = tagger.tagText('Children');
  var m1 = findMatch(r, 'ex:Child');
  var m2 = findMatch(r, 'ex:Kid');
  assert(m1, 'TC-D02: Children matches ex:Child');
  assert(!m2, 'TC-D02: Children does not match ex:Kid');
})();

// TC-D03: "Running" matches only ex:RunningAct
(function TCD03() {
  var r = tagger.tagText('Running');
  var m1 = findMatch(r, 'ex:RunningAct');
  var m2 = findMatch(r, 'ex:SwimmingAct');
  assert(m1, 'TC-D03: Running matches ex:RunningAct');
  assert(!m2, 'TC-D03: Running does not match ex:SwimmingAct');
})();

// ═══════════════════════════════════════════════════════════════
// Backward Compatibility: keyword mode
// ═══════════════════════════════════════════════════════════════
console.log('--- Backward Compatibility ---');

(function backwardCompat() {
  var medTTL = [
    '@prefix med: <http://example.org/medical#> .',
    '@prefix bfo: <http://purl.obolibrary.org/obo/> .',
    '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .',
    'med:CardiovascularDisease a bfo:BFO_0000016 ;',
    '    rdfs:label "Cardiovascular Disease" ;',
    '    med:indicators "chest pain, shortness of breath, heart attack" .'
  ].join('\n');

  var kwTagger = OntologyTextTagger.fromTTL(medTTL, {
    propertyMap: { keywords: 'med:indicators', label: 'rdfs:label' }
  });

  assert(kwTagger._matchMode === 'keyword', 'Keyword mode for custom property');

  var r = kwTagger.tagText('chest pain');
  assert(r.length > 0, 'Keyword mode still works for custom ontologies');
  assert(!r[0].ontologyMatchType, 'Keyword mode results have no ontologyMatchType');
})();

// ═══════════════════════════════════════════════════════════════
// Results
// ═══════════════════════════════════════════════════════════════
console.log('\n=== Results ===');
console.log('Passed: ' + passed + ' / ' + (passed + failed));
if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(function(f) { console.log('  - ' + f); });
}
process.exit(failed > 0 ? 1 : 0);
