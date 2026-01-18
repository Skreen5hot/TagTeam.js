/**
 * TTL Parser Tests
 *
 * Tests for TTLParser.js with lazy N3.js loading
 * Verifies Turtle parsing, error handling, and utility methods
 *
 * Week 3 - January 2026
 * TagTeam v3.0 - Phase 2
 */

const TTLParser = require('../../src/ontology/TTLParser');

// Test helper
function expect(actual) {
    return {
        toBe: function(expected) {
            if (actual !== expected) {
                throw new Error(`Expected ${expected} but got ${actual}`);
            }
        },
        toEqual: function(expected) {
            const actualStr = JSON.stringify(actual);
            const expectedStr = JSON.stringify(expected);
            if (actualStr !== expectedStr) {
                throw new Error(`Expected ${expectedStr} but got ${actualStr}`);
            }
        },
        toBeGreaterThan: function(expected) {
            if (actual <= expected) {
                throw new Error(`Expected ${actual} to be greater than ${expected}`);
            }
        },
        toContain: function(expected) {
            if (!actual.includes(expected)) {
                throw new Error(`Expected "${actual}" to contain "${expected}"`);
            }
        },
        toBeInstanceOf: function(expectedClass) {
            if (!(actual instanceof expectedClass)) {
                throw new Error(`Expected instance of ${expectedClass.name}`);
            }
        }
    };
}

// Run tests
console.log('Running TTL Parser Tests...\n');

let passedTests = 0;
let failedTests = 0;

function test(description, fn) {
    return new Promise(async (resolve) => {
        try {
            await fn();
            console.log(`✓ ${description}`);
            passedTests++;
            resolve();
        } catch (e) {
            console.log(`✗ ${description}`);
            console.log(`  Error: ${e.message}`);
            failedTests++;
            resolve();
        }
    });
}

// Test suite
(async function runTests() {
    const parser = new TTLParser();

    console.log('=== Basic Parsing Tests ===\n');

    await test('Parses simple triple', async () => {
        const ttl = `
            @prefix ex: <http://example.org/> .
            ex:subject ex:predicate ex:object .
        `;

        const result = await parser.parse(ttl);
        expect(result.triples.length).toBe(1);
        expect(result.triples[0].subject).toBe('http://example.org/subject');
        expect(result.triples[0].predicate).toBe('http://example.org/predicate');
        expect(result.triples[0].object).toBe('http://example.org/object');
    });

    await test('Parses multiple triples', async () => {
        const ttl = `
            @prefix ex: <http://example.org/> .
            ex:subject1 ex:predicate1 ex:object1 .
            ex:subject2 ex:predicate2 ex:object2 .
            ex:subject3 ex:predicate3 ex:object3 .
        `;

        const result = await parser.parse(ttl);
        expect(result.triples.length).toBe(3);
    });

    await test('Parses literal values', async () => {
        const ttl = `
            @prefix ex: <http://example.org/> .
            ex:person ex:name "John Doe" .
            ex:person ex:age 42 .
        `;

        const result = await parser.parse(ttl);
        expect(result.triples.length).toBe(2);

        const nameTriple = result.triples[0];
        expect(nameTriple.object).toBe('John Doe');
        expect(nameTriple.objectType).toBe('Literal');
    });

    await test('Parses language-tagged literals', async () => {
        const ttl = `
            @prefix ex: <http://example.org/> .
            ex:concept ex:label "consent"@en .
            ex:concept ex:label "consentimiento"@es .
        `;

        const result = await parser.parse(ttl);
        expect(result.triples.length).toBe(2);

        const enTriple = result.triples.find(t => t.objectLanguage === 'en');
        expect(enTriple.object).toBe('consent');

        const esTriple = result.triples.find(t => t.objectLanguage === 'es');
        expect(esTriple.object).toBe('consentimiento');
    });

    await test('Extracts prefixes', async () => {
        const ttl = `
            @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
            @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
            @prefix ex: <http://example.org/> .

            ex:concept rdf:type rdfs:Class .
        `;

        const result = await parser.parse(ttl);
        expect(result.prefixes.rdf).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
        expect(result.prefixes.rdfs).toBe('http://www.w3.org/2000/01/rdf-schema#');
        expect(result.prefixes.ex).toBe('http://example.org/');
    });

    console.log('\n=== BFO-Style Ontology Tests ===\n');

    await test('Parses BFO-style class hierarchy', async () => {
        const ttl = `
            @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
            @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
            @prefix bfo: <http://purl.obolibrary.org/obo/BFO_> .

            bfo:0000015 rdf:type rdfs:Class ;
                rdfs:label "process"@en ;
                rdfs:subClassOf bfo:0000001 .
        `;

        const result = await parser.parse(ttl);
        expect(result.triples.length).toBeGreaterThan(0);

        const typeTriples = result.triples.filter(t =>
            t.predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
        );
        expect(typeTriples.length).toBeGreaterThan(0);
    });

    await test('Parses ethical concept with properties', async () => {
        const ttl = `
            @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
            @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
            @prefix ethics: <http://tagteam.dev/ontology/ethics#> .
            @prefix tagteam: <http://tagteam.dev/ontology/core#> .

            ethics:Autonomy rdf:type rdfs:Class ;
                rdfs:label "Autonomy"@en ;
                tagteam:semanticMarker "informed consent" ;
                tagteam:semanticMarker "patient autonomy" ;
                tagteam:polarity 1.0 .
        `;

        const result = await parser.parse(ttl);
        expect(result.triples.length).toBeGreaterThan(0);

        // Find semantic marker triples
        const markerTriples = result.triples.filter(t =>
            t.predicate === 'http://tagteam.dev/ontology/core#semanticMarker'
        );
        expect(markerTriples.length).toBe(2);
    });

    console.log('\n=== Error Handling Tests ===\n');

    await test('Throws error for malformed TTL', async () => {
        const badTtl = `
            @prefix ex: <http://example.org/> .
            ex:subject ex:predicate  # Missing object!
        `;

        try {
            await parser.parse(badTtl);
            throw new Error('Should have thrown error');
        } catch (e) {
            expect(e.message).toContain('Malformed TTL syntax');
        }
    });

    await test('Throws error for undefined prefix', async () => {
        const badTtl = `
            undefinedPrefix:subject ex:predicate ex:object .
        `;

        try {
            await parser.parse(badTtl);
            throw new Error('Should have thrown error');
        } catch (e) {
            expect(e.message).toContain('prefix');
        }
    });

    await test('Throws error for empty string', async () => {
        try {
            await parser.parse('');
            throw new Error('Should have thrown error');
        } catch (e) {
            expect(e.message).toContain('non-empty string');
        }
    });

    await test('Throws error for non-string input', async () => {
        try {
            await parser.parse(null);
            throw new Error('Should have thrown error');
        } catch (e) {
            expect(e.message).toContain('non-empty string');
        }
    });

    console.log('\n=== Utility Method Tests ===\n');

    await test('extractSubjects returns unique subjects', async () => {
        const ttl = `
            @prefix ex: <http://example.org/> .
            ex:subject1 ex:predicate1 ex:object1 .
            ex:subject1 ex:predicate2 ex:object2 .
            ex:subject2 ex:predicate3 ex:object3 .
        `;

        const result = await parser.parse(ttl);
        const subjects = TTLParser.extractSubjects(result.triples);

        expect(subjects.length).toBe(2);
        expect(subjects).toContain('http://example.org/subject1');
        expect(subjects).toContain('http://example.org/subject2');
    });

    await test('filterByPredicate filters correctly', async () => {
        const ttl = `
            @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
            @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
            @prefix ex: <http://example.org/> .

            ex:concept1 rdf:type rdfs:Class .
            ex:concept2 rdf:type rdfs:Class .
            ex:concept1 rdfs:label "Concept 1" .
        `;

        const result = await parser.parse(ttl);
        const typeTriples = TTLParser.filterByPredicate(
            result.triples,
            'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
        );

        expect(typeTriples.length).toBe(2);
    });

    await test('groupBySubject groups correctly', async () => {
        const ttl = `
            @prefix ex: <http://example.org/> .
            ex:subject1 ex:predicate1 ex:object1 .
            ex:subject1 ex:predicate2 ex:object2 .
            ex:subject2 ex:predicate3 ex:object3 .
        `;

        const result = await parser.parse(ttl);
        const grouped = TTLParser.groupBySubject(result.triples);

        expect(Object.keys(grouped).length).toBe(2);
        expect(grouped['http://example.org/subject1'].length).toBe(2);
        expect(grouped['http://example.org/subject2'].length).toBe(1);
    });

    await test('resolvePrefix expands prefixed IRIs', async () => {
        const prefixes = {
            'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
            'ex': 'http://example.org/'
        };

        const resolved = TTLParser.resolvePrefix('rdf:type', prefixes);
        expect(resolved).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');

        const resolved2 = TTLParser.resolvePrefix('ex:concept', prefixes);
        expect(resolved2).toBe('http://example.org/concept');
    });

    await test('resolvePrefix throws error for unknown prefix', async () => {
        const prefixes = { 'ex': 'http://example.org/' };

        try {
            TTLParser.resolvePrefix('unknown:concept', prefixes);
            throw new Error('Should have thrown error');
        } catch (e) {
            expect(e.message).toContain('Prefix not found');
        }
    });

    console.log('\n=== Statistics Tests ===\n');

    await test('Tracks parse statistics', async () => {
        const newParser = new TTLParser();

        const ttl = `
            @prefix ex: <http://example.org/> .
            ex:s1 ex:p1 ex:o1 .
            ex:s2 ex:p2 ex:o2 .
        `;

        await newParser.parse(ttl);
        await newParser.parse(ttl);

        const stats = newParser.getStats();
        expect(stats.parseCount).toBe(2);
        expect(stats.tripleCount).toBe(4); // 2 triples per parse * 2 parses
    });

    await test('resetStats clears statistics', async () => {
        const newParser = new TTLParser();

        const ttl = `@prefix ex: <http://example.org/> . ex:s ex:p ex:o .`;
        await newParser.parse(ttl);

        newParser.resetStats();
        const stats = newParser.getStats();

        expect(stats.parseCount).toBe(0);
        expect(stats.tripleCount).toBe(0);
    });

    console.log('\n=== Cache Tests ===\n');

    await test('N3.js library is cached after first load', async () => {
        const newParser = new TTLParser();

        const ttl = `@prefix ex: <http://example.org/> . ex:s ex:p ex:o .`;
        await newParser.parse(ttl);

        // Second parse should use cached N3.js
        await newParser.parse(ttl);

        // Verify cache exists
        expect(newParser._n3Cache !== null).toBe(true);
    });

    await test('clearCache removes N3.js cache', async () => {
        const newParser = new TTLParser();

        const ttl = `@prefix ex: <http://example.org/> . ex:s ex:p ex:o .`;
        await newParser.parse(ttl);

        newParser.clearCache();
        expect(newParser._n3Cache === null).toBe(true);
    });

    // Final summary
    console.log('\n=== Summary ===\n');
    console.log(`Total tests: ${passedTests + failedTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);

    if (failedTests === 0) {
        console.log('\n✓ All tests passed!');
        console.log('\nTTLParser.js is working correctly:');
        console.log('  • Lazy-loads N3.js (no bundle bloat)');
        console.log('  • Parses Turtle RDF format');
        console.log('  • Extracts triples with metadata');
        console.log('  • Handles prefixes and namespaces');
        console.log('  • Provides utility methods');
        console.log('  • Tracks statistics');
        console.log('  • Caches N3.js for performance');
        process.exit(0);
    } else {
        console.log('\n✗ Some tests failed');
        process.exit(1);
    }
})();
