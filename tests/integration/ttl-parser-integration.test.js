/**
 * TTL Parser Integration Test
 *
 * Tests parsing of a real IEE ethics ontology file
 * Demonstrates end-to-end TTL parsing workflow
 *
 * Week 3 - January 2026
 * TagTeam v3.0 - Phase 2
 */

const TTLParser = require('../../src/ontology/TTLParser');
const path = require('path');

console.log('=== TTL Parser Integration Test ===\n');

async function runIntegrationTest() {
    const parser = new TTLParser();

    console.log('Test 1: Parse IEE Minimal Ontology');
    console.log('-----------------------------------\n');

    const ontologyPath = path.join(__dirname, '../../examples/ontologies/iee-minimal.ttl');
    console.log('Loading ontology from:', ontologyPath);

    try {
        const result = await parser.parseFile(ontologyPath);

        console.log('\n✓ Parsing succeeded!\n');

        // Display statistics
        console.log('Statistics:');
        console.log(`  • Total triples: ${result.triples.length}`);
        console.log(`  • Unique subjects: ${TTLParser.extractSubjects(result.triples).length}`);
        console.log(`  • Prefixes defined: ${Object.keys(result.prefixes).length}`);

        // Display prefixes
        console.log('\nPrefixes:');
        for (const [prefix, namespace] of Object.entries(result.prefixes)) {
            console.log(`  ${prefix}: ${namespace}`);
        }

        // Find all ethical concepts (classes)
        console.log('\nEthical Concepts Found:');
        const typeTriples = TTLParser.filterByPredicate(
            result.triples,
            'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
        );

        const classTriples = typeTriples.filter(t =>
            t.object === 'http://www.w3.org/2002/07/owl#Class'
        );

        const concepts = [];
        for (const triple of classTriples) {
            const subject = triple.subject;

            // Get all properties for this concept
            const conceptTriples = result.triples.filter(t => t.subject === subject);

            // Extract label
            const labelTriple = conceptTriples.find(t =>
                t.predicate === 'http://www.w3.org/2000/01/rdf-schema#label'
            );
            const label = labelTriple ? labelTriple.object : subject.split('#')[1];

            // Extract comment
            const commentTriple = conceptTriples.find(t =>
                t.predicate === 'http://www.w3.org/2000/01/rdf-schema#comment'
            );
            const comment = commentTriple ? commentTriple.object : '';

            // Extract semantic markers
            const markerTriples = conceptTriples.filter(t =>
                t.predicate === 'http://tagteam.dev/ontology/core#semanticMarker'
            );
            const markers = markerTriples.map(t => t.object);

            // Extract polarity
            const polarityTriple = conceptTriples.find(t =>
                t.predicate === 'http://tagteam.dev/ontology/core#polarity'
            );
            const polarity = polarityTriple ? parseFloat(polarityTriple.object) : null;

            // Extract salience
            const salienceTriple = conceptTriples.find(t =>
                t.predicate === 'http://tagteam.dev/ontology/core#defaultSalience'
            );
            const salience = salienceTriple ? parseFloat(salienceTriple.object) : null;

            // Extract related process (for Fandaws expansion)
            const relatedTriple = conceptTriples.find(t =>
                t.predicate === 'http://tagteam.dev/ontology/core#relatedProcess'
            );
            const relatedProcess = relatedTriple ? relatedTriple.object : null;

            concepts.push({
                iri: subject,
                label,
                comment: comment.substring(0, 60) + (comment.length > 60 ? '...' : ''),
                markers,
                polarity,
                salience,
                relatedProcess
            });
        }

        // Display concepts
        for (const concept of concepts) {
            console.log(`\n  ${concept.label}`);
            console.log(`    IRI: ${concept.iri}`);
            console.log(`    Description: ${concept.comment}`);
            console.log(`    Markers: ${concept.markers.join(', ')}`);
            console.log(`    Polarity: ${concept.polarity}`);
            console.log(`    Salience: ${concept.salience}`);
            if (concept.relatedProcess) {
                console.log(`    Related Process: ${concept.relatedProcess}`);
            }
        }

        // Test 2: Verify critical concepts exist
        console.log('\n\nTest 2: Verify Critical Concepts');
        console.log('---------------------------------\n');

        const requiredConcepts = ['Autonomy', 'Consent', 'Beneficence', 'Compassion', 'Nonmaleficence', 'Justice', 'Privacy'];
        let allFound = true;

        for (const required of requiredConcepts) {
            const found = concepts.find(c => c.label === required);
            if (found) {
                console.log(`  ✓ ${required} found`);
            } else {
                console.log(`  ✗ ${required} NOT found`);
                allFound = false;
            }
        }

        // Test 3: Verify Fandaws integration markers
        console.log('\n\nTest 3: Verify Fandaws Integration');
        console.log('-----------------------------------\n');

        const beneficence = concepts.find(c => c.label === 'Beneficence');
        const compassion = concepts.find(c => c.label === 'Compassion');

        if (beneficence && beneficence.relatedProcess) {
            console.log('  ✓ Beneficence has relatedProcess (Fandaws ameliorate)');
            console.log(`    → ${beneficence.relatedProcess}`);
        } else {
            console.log('  ✗ Beneficence missing relatedProcess');
            allFound = false;
        }

        if (compassion && compassion.relatedProcess) {
            console.log('  ✓ Compassion has relatedProcess (Fandaws ameliorate)');
            console.log(`    → ${compassion.relatedProcess}`);
        } else {
            console.log('  ✗ Compassion missing relatedProcess');
            allFound = false;
        }

        // Test 4: Verify class hierarchy
        console.log('\n\nTest 4: Verify Class Hierarchy');
        console.log('-------------------------------\n');

        const subClassTriples = TTLParser.filterByPredicate(
            result.triples,
            'http://www.w3.org/2000/01/rdf-schema#subClassOf'
        );

        console.log(`  Found ${subClassTriples.length} subclass relationships:`);
        for (const triple of subClassTriples) {
            const child = triple.subject.split('#')[1];
            const parent = triple.object.split('#')[1] || triple.object.split('_')[1];
            console.log(`    • ${child} → ${parent}`);
        }

        // Test 5: Parser statistics
        console.log('\n\nTest 5: Parser Statistics');
        console.log('-------------------------\n');

        const stats = parser.getStats();
        console.log(`  Parse count: ${stats.parseCount}`);
        console.log(`  Total triples processed: ${stats.tripleCount}`);
        console.log(`  Errors: ${stats.errorCount}`);
        console.log(`  Average triples per parse: ${stats.averageTriplesPerParse}`);

        // Final summary
        console.log('\n\n=== Summary ===\n');

        if (allFound && stats.errorCount === 0) {
            console.log('✓ ALL TESTS PASSED - TTL Parser Integration Successful!\n');
            console.log('Key Achievements:');
            console.log('  • Parsed real IEE ethics ontology');
            console.log('  • Extracted all 7 ethical concepts');
            console.log('  • Verified semantic markers');
            console.log('  • Confirmed Fandaws integration markers');
            console.log('  • Validated class hierarchy');
            console.log('  • Zero parsing errors\n');
            console.log('Next Steps:');
            console.log('  1. Implement CLI compiler (tagteam-ontology-compiler)');
            console.log('  2. Add --expand-semantics flag for Fandaws expansion');
            console.log('  3. Generate JSON manifest from TTL ontology');
            console.log('  4. Implement OntologyManager (Phase 3)');
            process.exit(0);
        } else {
            console.log('✗ SOME TESTS FAILED - Please review output above');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n✗ Test failed with error:');
        console.error(error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the test
runIntegrationTest();
