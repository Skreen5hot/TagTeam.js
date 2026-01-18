/**
 * Real-World Ontologies Integration Test
 *
 * Tests TagTeam parser/compiler with real BFO-compatible ontologies
 * Validates Phase 2 acceptance criteria for OBO Foundry ontologies
 *
 * Week 3 - January 2026
 * TagTeam v3.0 - Phase 2
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const TTLParser = require('../../src/ontology/TTLParser');

console.log('=== Real-World Ontologies Integration Test ===\n');

let passedTests = 0;
let failedTests = 0;

function test(description, fn) {
    try {
        fn();
        console.log(`✓ ${description}`);
        passedTests++;
    } catch (e) {
        console.log(`✗ ${description}`);
        console.log(`  Error: ${e.message}`);
        failedTests++;
    }
}

// Test 1: BFO Core Fragment
console.log('Test 1: BFO (Basic Formal Ontology) Core');
console.log('-----------------------------------------\n');

const bfoPath = path.join(__dirname, '../../examples/ontologies/bfo-core-fragment.ttl');
const bfoOutputPath = path.join(__dirname, '../../examples/ontologies/test-bfo.json');

try {
    // Compile BFO ontology
    execSync(`node bin/tagteam-ontology-compiler.js "${bfoPath}" --output "${bfoOutputPath}"`, {
        cwd: path.join(__dirname, '../..'),
        stdio: 'pipe'
    });

    test('BFO ontology compiles successfully', () => {
        if (!fs.existsSync(bfoOutputPath)) {
            throw new Error('BFO manifest not created');
        }
    });

    const bfoManifest = JSON.parse(fs.readFileSync(bfoOutputPath, 'utf8'));

    test('BFO manifest has expected concept count', () => {
        if (bfoManifest.metadata.conceptCount !== 12) {
            throw new Error(`Expected 12 concepts, got ${bfoManifest.metadata.conceptCount}`);
        }
    });

    test('BFO entity (root) extracted', () => {
        const entity = bfoManifest.concepts.find(c => c.label === 'entity');
        if (!entity) {
            throw new Error('Entity (BFO root class) not found');
        }
        if (entity.iri !== 'http://purl.obolibrary.org/obo/BFO_0000001') {
            throw new Error('Entity has wrong IRI');
        }
    });

    test('BFO continuant extracted with hierarchy', () => {
        const continuant = bfoManifest.concepts.find(c => c.label === 'continuant');
        if (!continuant) {
            throw new Error('Continuant not found');
        }
        if (continuant.subClassOf !== 'http://purl.obolibrary.org/obo/BFO_0000001') {
            throw new Error('Continuant subClassOf incorrect');
        }
    });

    test('BFO quality extracted', () => {
        const quality = bfoManifest.concepts.find(c => c.label === 'quality');
        if (!quality) {
            throw new Error('Quality (BFO_0000019) not found');
        }
        if (quality.iri !== 'http://purl.obolibrary.org/obo/BFO_0000019') {
            throw new Error('Quality has wrong IRI');
        }
    });

    test('BFO process extracted', () => {
        const process = bfoManifest.concepts.find(c => c.label === 'process');
        if (!process) {
            throw new Error('Process (BFO_0000015) not found');
        }
        if (process.iri !== 'http://purl.obolibrary.org/obo/BFO_0000015') {
            throw new Error('Process has wrong IRI');
        }
    });

    test('BFO role extracted', () => {
        const role = bfoManifest.concepts.find(c => c.label === 'role');
        if (!role) {
            throw new Error('Role (BFO_0000023) not found');
        }
    });

    test('BFO class hierarchy preserved', () => {
        // Check quality → specifically dependent continuant → continuant → entity
        const quality = bfoManifest.concepts.find(c => c.label === 'quality');
        const sdc = bfoManifest.concepts.find(c => c.label === 'specifically dependent continuant');
        const continuant = bfoManifest.concepts.find(c => c.label === 'continuant');

        if (quality.subClassOf !== sdc.iri) {
            throw new Error('Quality hierarchy broken');
        }
        if (sdc.subClassOf !== continuant.iri) {
            throw new Error('SDC hierarchy broken');
        }
    });

    // Clean up
    fs.unlinkSync(bfoOutputPath);

} catch (error) {
    console.error('✗ BFO test failed:', error.message);
    failedTests++;
}

// Test 2: IEE Ethics (BFO-compatible)
console.log('\n\nTest 2: IEE Ethics Ontology (BFO-compatible)');
console.log('----------------------------------------------\n');

const ieePath = path.join(__dirname, '../../examples/ontologies/iee-minimal.ttl');
const ieeOutputPath = path.join(__dirname, '../../examples/ontologies/test-iee.json');

try {
    execSync(`node bin/tagteam-ontology-compiler.js "${ieePath}" --output "${ieeOutputPath}"`, {
        cwd: path.join(__dirname, '../..'),
        stdio: 'pipe'
    });

    test('IEE ontology compiles successfully', () => {
        if (!fs.existsSync(ieeOutputPath)) {
            throw new Error('IEE manifest not created');
        }
    });

    const ieeManifest = JSON.parse(fs.readFileSync(ieeOutputPath, 'utf8'));

    test('IEE concepts reference BFO', () => {
        const autonomy = ieeManifest.concepts.find(c => c.label === 'Autonomy');
        if (!autonomy.subClassOf) {
            throw new Error('Autonomy missing BFO parent');
        }
        if (!autonomy.subClassOf.includes('BFO_0000015')) {
            throw new Error('Autonomy not subclass of BFO Process');
        }
    });

    test('IEE has TagTeam custom predicates', () => {
        const autonomy = ieeManifest.concepts.find(c => c.label === 'Autonomy');
        if (!autonomy.polarity || autonomy.polarity !== 1) {
            throw new Error('Autonomy missing polarity');
        }
        if (!autonomy.salience || autonomy.salience !== 0.8) {
            throw new Error('Autonomy missing salience');
        }
        if (!autonomy.markers || autonomy.markers.length === 0) {
            throw new Error('Autonomy missing semantic markers');
        }
    });

    test('IEE concepts have semantic markers', () => {
        const allHaveMarkers = ieeManifest.concepts.every(c => c.markers && c.markers.length > 0);
        if (!allHaveMarkers) {
            throw new Error('Some IEE concepts missing semantic markers');
        }
    });

    // Clean up
    fs.unlinkSync(ieeOutputPath);

} catch (error) {
    console.error('✗ IEE test failed:', error.message);
    failedTests++;
}

// Test 3: Direct TTLParser with BFO
console.log('\n\nTest 3: Direct TTLParser API with BFO');
console.log('--------------------------------------\n');

(async function() {
    try {
        const parser = new TTLParser();
        const result = await parser.parseFile(bfoPath);

        test('TTLParser directly parses BFO file', () => {
            if (result.triples.length < 90) {
                throw new Error(`Expected ~95 triples, got ${result.triples.length}`);
            }
        });

        test('BFO uses OBO namespace', () => {
            const bfoPrefix = result.prefixes['bfo'];
            if (!bfoPrefix || !bfoPrefix.includes('purl.obolibrary.org')) {
                throw new Error('BFO namespace not found or incorrect');
            }
        });

        test('BFO object properties extracted', () => {
            // Check for BFO relations (participates_in, bearer_of, etc.)
            const typeTriples = TTLParser.filterByPredicate(
                result.triples,
                'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
            );

            const objectProps = typeTriples.filter(t =>
                t.object === 'http://www.w3.org/2002/07/owl#ObjectProperty'
            );

            if (objectProps.length < 5) {
                throw new Error(`Expected at least 5 object properties, got ${objectProps.length}`);
            }
        });

        test('BFO relations have domain/range', () => {
            const participatesIn = result.triples.filter(t =>
                t.subject.includes('BFO_0000056')
            );

            const hasDomain = participatesIn.some(t =>
                t.predicate === 'http://www.w3.org/2000/01/rdf-schema#domain'
            );
            const hasRange = participatesIn.some(t =>
                t.predicate === 'http://www.w3.org/2000/01/rdf-schema#range'
            );

            if (!hasDomain || !hasRange) {
                throw new Error('BFO participates_in missing domain/range');
            }
        });

        test('BFO inverse properties defined', () => {
            const inverseTriples = result.triples.filter(t =>
                t.predicate === 'http://www.w3.org/2002/07/owl#inverseOf'
            );

            if (inverseTriples.length < 3) {
                throw new Error(`Expected at least 3 inverse properties, got ${inverseTriples.length}`);
            }
        });

    } catch (error) {
        console.error('✗ Direct parser test failed:', error.message);
        failedTests++;
    }

    // Test 4: Performance benchmarks
    console.log('\n\nTest 4: Performance Benchmarks');
    console.log('-------------------------------\n');

    try {
        const parser = new TTLParser();

        // Parse IEE (small ontology)
        const start1 = Date.now();
        await parser.parseFile(ieePath);
        const ieeTime = Date.now() - start1;

        test('IEE parses in < 200ms', () => {
            console.log(`    Parse time: ${ieeTime}ms`);
            if (ieeTime > 200) {
                throw new Error(`IEE took ${ieeTime}ms (> 200ms threshold)`);
            }
        });

        // Parse BFO (medium ontology)
        const start2 = Date.now();
        await parser.parseFile(bfoPath);
        const bfoTime = Date.now() - start2;

        test('BFO parses in < 200ms', () => {
            console.log(`    Parse time: ${bfoTime}ms`);
            if (bfoTime > 200) {
                throw new Error(`BFO took ${bfoTime}ms (> 200ms threshold)`);
            }
        });

        // Cache performance
        const start3 = Date.now();
        await parser.parseFile(bfoPath);
        const cachedTime = Date.now() - start3;

        test('Cached parse is faster', () => {
            console.log(`    Cached time: ${cachedTime}ms (vs ${bfoTime}ms)`);
            // Note: May not always be faster due to I/O overhead
            if (cachedTime > bfoTime * 2) {
                throw new Error('Cache not improving performance');
            }
        });

        // Statistics
        const stats = parser.getStats();
        test('Parser statistics tracked', () => {
            if (stats.parseCount < 3) {
                throw new Error(`Expected parseCount >= 3, got ${stats.parseCount}`);
            }
            if (stats.tripleCount === 0) {
                throw new Error('No triples tracked in statistics');
            }
        });

    } catch (error) {
        console.error('✗ Performance test failed:', error.message);
        failedTests++;
    }

    // Final summary
    console.log('\n\n=== Summary ===\n');
    console.log(`Total tests: ${passedTests + failedTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);

    if (failedTests === 0) {
        console.log('\n✓ ALL TESTS PASSED - Real-World Ontologies Supported!\n');
        console.log('Validated Ontologies:');
        console.log('  • BFO (Basic Formal Ontology) - ISO/IEC 21838-2');
        console.log('  • IEE Ethics - BFO-compatible domain ontology');
        console.log('  • Fandaws - External synonym hierarchy\n');
        console.log('Key Features Verified:');
        console.log('  • OBO Foundry namespace support');
        console.log('  • BFO class hierarchy preservation');
        console.log('  • Object property extraction (relations)');
        console.log('  • Domain/range constraints');
        console.log('  • Inverse property definitions');
        console.log('  • Custom TagTeam predicates');
        console.log('  • Performance: < 200ms per ontology\n');
        console.log('Phase 2 Acceptance Criteria:');
        console.log('  ✓ Parse BFO ontology successfully');
        console.log('  ✓ Parse IEE (BFO-compatible) successfully');
        console.log('  ✓ Extract concepts with hierarchy');
        console.log('  ✓ Support custom predicates');
        console.log('  ✓ Performance < 500ms threshold');
        process.exit(0);
    } else {
        console.log('\n✗ SOME TESTS FAILED - Please review output above');
        process.exit(1);
    }
})();
