/**
 * CLI Compiler Integration Test
 *
 * Tests the tagteam-ontology-compiler CLI tool
 * Verifies basic compilation and semantic expansion
 *
 * Week 3 - January 2026
 * TagTeam v3.0 - Phase 2
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== CLI Compiler Integration Test ===\n');

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

// Test 1: Basic compilation
console.log('Test 1: Basic Ontology Compilation');
console.log('-----------------------------------\n');

const inputPath = path.join(__dirname, '../../examples/ontologies/iee-minimal.ttl');
const outputPath = path.join(__dirname, '../../examples/ontologies/test-output.json');

// Remove output file if it exists
if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
}

try {
    execSync(`node bin/tagteam-ontology-compiler.js "${inputPath}" --output "${outputPath}"`, {
        cwd: path.join(__dirname, '../..'),
        stdio: 'pipe'
    });

    test('CLI executes successfully', () => {
        if (!fs.existsSync(outputPath)) {
            throw new Error('Output file not created');
        }
    });

    const manifest = JSON.parse(fs.readFileSync(outputPath, 'utf8'));

    test('Manifest has correct version', () => {
        if (manifest.version !== '3.0.0') {
            throw new Error(`Expected version 3.0.0, got ${manifest.version}`);
        }
    });

    test('Manifest has source metadata', () => {
        if (manifest.source !== 'iee-minimal.ttl') {
            throw new Error(`Expected source iee-minimal.ttl, got ${manifest.source}`);
        }
    });

    test('Manifest has compiledAt timestamp', () => {
        if (!manifest.compiledAt || isNaN(Date.parse(manifest.compiledAt))) {
            throw new Error('Invalid compiledAt timestamp');
        }
    });

    test('Extracted 7 concepts', () => {
        if (manifest.metadata.conceptCount !== 7) {
            throw new Error(`Expected 7 concepts, got ${manifest.metadata.conceptCount}`);
        }
    });

    test('Concepts have required fields', () => {
        const concept = manifest.concepts[0];
        if (!concept.iri || !concept.label || !Array.isArray(concept.markers)) {
            throw new Error('Concept missing required fields');
        }
    });

    test('Autonomy concept extracted correctly', () => {
        const autonomy = manifest.concepts.find(c => c.label === 'Autonomy');
        if (!autonomy) {
            throw new Error('Autonomy concept not found');
        }
        if (autonomy.polarity !== 1) {
            throw new Error(`Expected polarity 1, got ${autonomy.polarity}`);
        }
        if (autonomy.salience !== 0.8) {
            throw new Error(`Expected salience 0.8, got ${autonomy.salience}`);
        }
        if (autonomy.markers.length !== 3) {
            throw new Error(`Expected 3 markers, got ${autonomy.markers.length}`);
        }
    });

    // Clean up
    fs.unlinkSync(outputPath);

} catch (error) {
    console.error('✗ Basic compilation failed:', error.message);
    failedTests++;
}

// Test 2: Semantic expansion
console.log('\n\nTest 2: Semantic Expansion (Fandaws)');
console.log('-------------------------------------\n');

const expansionPath = path.join(__dirname, '../../examples/ontologies/fandaws-ameliorate.ttl');
const expandedOutputPath = path.join(__dirname, '../../examples/ontologies/test-expanded.json');

// Remove output file if it exists
if (fs.existsSync(expandedOutputPath)) {
    fs.unlinkSync(expandedOutputPath);
}

try {
    execSync(
        `node bin/tagteam-ontology-compiler.js "${inputPath}" ` +
        `--expand-semantics "${expansionPath}" ` +
        `--map "ethics:Beneficence=fan:ameliorate" ` +
        `--output "${expandedOutputPath}"`,
        {
            cwd: path.join(__dirname, '../..'),
            stdio: 'pipe'
        }
    );

    test('Expansion CLI executes successfully', () => {
        if (!fs.existsSync(expandedOutputPath)) {
            throw new Error('Expanded output file not created');
        }
    });

    const expandedManifest = JSON.parse(fs.readFileSync(expandedOutputPath, 'utf8'));

    test('Expanded manifest has expansion metadata', () => {
        if (!expandedManifest.metadata.expanded) {
            throw new Error('Expansion flag not set');
        }
        if (expandedManifest.metadata.expansionSource !== 'fandaws-ameliorate.ttl') {
            throw new Error(`Expected expansion source fandaws-ameliorate.ttl, got ${expandedManifest.metadata.expansionSource}`);
        }
    });

    test('Beneficence has expanded markers', () => {
        const beneficence = expandedManifest.concepts.find(c => c.label === 'Beneficence');
        if (!beneficence) {
            throw new Error('Beneficence concept not found');
        }

        // Original markers: 3, Fandaws synonyms: 21, Total: 24
        if (beneficence.markers.length < 20) {
            throw new Error(`Expected at least 20 markers, got ${beneficence.markers.length}`);
        }

        // Check for specific Fandaws terms
        const hasAlleviate = beneficence.markers.includes('alleviate');
        const hasRelieve = beneficence.markers.includes('relieve');
        const hasMitigate = beneficence.markers.includes('mitigate');

        if (!hasAlleviate || !hasRelieve || !hasMitigate) {
            throw new Error('Missing expected Fandaws synonyms');
        }
    });

    test('Beneficence has expansion metadata', () => {
        const beneficence = expandedManifest.concepts.find(c => c.label === 'Beneficence');
        if (!beneficence.expansionSource) {
            throw new Error('Missing expansionSource');
        }
        if (!beneficence.expandedTermCount || beneficence.expandedTermCount < 20) {
            throw new Error(`Expected expandedTermCount >= 20, got ${beneficence.expandedTermCount}`);
        }
    });

    test('Other concepts unchanged', () => {
        const autonomy = expandedManifest.concepts.find(c => c.label === 'Autonomy');
        if (autonomy.markers.length !== 3) {
            throw new Error(`Autonomy should have 3 markers, got ${autonomy.markers.length}`);
        }
        if (autonomy.expansionSource) {
            throw new Error('Autonomy should not have expansion metadata');
        }
    });

    test('Total markers increased significantly', () => {
        // Original: 21 markers, After expansion: ~42 markers
        if (expandedManifest.metadata.totalMarkers < 40) {
            throw new Error(`Expected at least 40 total markers, got ${expandedManifest.metadata.totalMarkers}`);
        }
    });

    // Clean up
    fs.unlinkSync(expandedOutputPath);

} catch (error) {
    console.error('✗ Semantic expansion failed:', error.message);
    failedTests++;
}

// Test 3: Minification
console.log('\n\nTest 3: Minified Output');
console.log('-----------------------\n');

const minifiedOutputPath = path.join(__dirname, '../../examples/ontologies/test-minified.json');

// Remove output file if it exists
if (fs.existsSync(minifiedOutputPath)) {
    fs.unlinkSync(minifiedOutputPath);
}

try {
    execSync(
        `node bin/tagteam-ontology-compiler.js "${inputPath}" --output "${minifiedOutputPath}" --minify`,
        {
            cwd: path.join(__dirname, '../..'),
            stdio: 'pipe'
        }
    );

    test('Minified output created', () => {
        if (!fs.existsSync(minifiedOutputPath)) {
            throw new Error('Minified output file not created');
        }
    });

    const minifiedContent = fs.readFileSync(minifiedOutputPath, 'utf8');
    const normalContent = fs.readFileSync(
        path.join(__dirname, '../../examples/ontologies/iee-minimal.json'),
        'utf8'
    );

    test('Minified output is smaller', () => {
        if (minifiedContent.length >= normalContent.length) {
            throw new Error(`Minified (${minifiedContent.length}) not smaller than normal (${normalContent.length})`);
        }
    });

    test('Minified output is valid JSON', () => {
        const parsed = JSON.parse(minifiedContent);
        if (parsed.metadata.conceptCount !== 7) {
            throw new Error('Minified JSON is corrupted');
        }
    });

    test('Minified output has no newlines', () => {
        const lines = minifiedContent.split('\n');
        if (lines.length > 1) {
            throw new Error(`Expected single line, got ${lines.length} lines`);
        }
    });

    // Clean up
    fs.unlinkSync(minifiedOutputPath);

} catch (error) {
    console.error('✗ Minification failed:', error.message);
    failedTests++;
}

// Final summary
console.log('\n\n=== Summary ===\n');
console.log(`Total tests: ${passedTests + failedTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);

if (failedTests === 0) {
    console.log('\n✓ ALL TESTS PASSED - CLI Compiler Working!\n');
    console.log('Key Features Verified:');
    console.log('  • Basic TTL → JSON compilation');
    console.log('  • Concept extraction with all metadata');
    console.log('  • Semantic expansion with Fandaws');
    console.log('  • Hierarchy traversal (21 synonyms)');
    console.log('  • Expansion metadata tracking');
    console.log('  • JSON minification');
    console.log('  • File size reduction\n');
    console.log('Next Steps:');
    console.log('  1. Implement OntologyManager (Phase 3)');
    console.log('  2. Add manifest loading support');
    console.log('  3. Integrate with ConceptMatcher');
    process.exit(0);
} else {
    console.log('\n✗ SOME TESTS FAILED - Please review output above');
    process.exit(1);
}
