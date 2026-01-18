#!/usr/bin/env node

/**
 * TagTeam Ontology Compiler
 *
 * CLI tool to pre-process ontologies for production optimization.
 * Converts large TTL/OWL files into lightweight JSON manifests.
 *
 * Usage:
 *   tagteam-compile input.ttl --output manifest.json
 *   tagteam-compile input.ttl --expand-semantics fandaws.ttl --output manifest.json
 *
 * Week 3 - January 2026
 * TagTeam v3.0 - Phase 2
 */

const fs = require('fs');
const path = require('path');
const TTLParser = require('../src/ontology/TTLParser');

// ========================================
// CLI ARGUMENT PARSING
// ========================================

function parseArgs(argv) {
    const args = {
        input: null,
        output: null,
        expandSemantics: null,
        map: [],
        format: 'json',
        minify: false,
        verbose: false,
        help: false
    };

    for (let i = 2; i < argv.length; i++) {
        const arg = argv[i];

        if (arg === '--help' || arg === '-h') {
            args.help = true;
        } else if (arg === '--output' || arg === '-o') {
            args.output = argv[++i];
        } else if (arg === '--expand-semantics') {
            args.expandSemantics = argv[++i];
        } else if (arg === '--map') {
            args.map.push(argv[++i]);
        } else if (arg === '--format') {
            args.format = argv[++i];
        } else if (arg === '--minify') {
            args.minify = true;
        } else if (arg === '--verbose' || arg === '-v') {
            args.verbose = true;
        } else if (!arg.startsWith('--') && !args.input) {
            args.input = arg;
        }
    }

    return args;
}

function printHelp() {
    console.log(`
TagTeam Ontology Compiler v3.0.0-alpha.1

USAGE:
  tagteam-compile <input.ttl> [options]

OPTIONS:
  -o, --output <file>              Output file path (default: <input>.json)
  --expand-semantics <file>        Expansion ontology for synonym enrichment
  --map <source=target>            Map concept to expansion hierarchy
                                   Example: "ethics:Beneficence=fan:ameliorate"
  --format <json|compact>          Output format (default: json)
  --minify                         Minify output JSON
  -v, --verbose                    Verbose logging
  -h, --help                       Show this help message

EXAMPLES:
  # Basic compilation
  tagteam-compile iee-ethics.ttl --output iee-manifest.json

  # With semantic expansion (Fandaws)
  tagteam-compile iee-ethics.ttl \\
    --expand-semantics fandaws-ameliorate.ttl \\
    --map "ethics:Beneficence=fan:ameliorate" \\
    --output iee-expanded.json

  # Minified production build
  tagteam-compile ontology.ttl --minify --output ontology.min.json

ABOUT:
  Converts Turtle (TTL) ontologies into lightweight JSON manifests for
  production use. Reduces file size (50MB OWL → 500KB JSON) and eliminates
  runtime parsing overhead.

  The --expand-semantics flag merges external synonym hierarchies (like
  Fandaws) into your ontology, solving vocabulary coverage issues without
  manual keyword curation.

DOCUMENTATION:
  https://github.com/yourusername/TagTeam.js/docs/cli-compiler.md
`);
}

// ========================================
// CONCEPT EXTRACTION
// ========================================

function extractConcepts(triples, prefixes, options = {}) {
    const concepts = [];

    // Group triples by subject
    const grouped = TTLParser.groupBySubject(triples);

    // Standard RDF/OWL predicates
    const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
    const RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label';
    const RDFS_COMMENT = 'http://www.w3.org/2000/01/rdf-schema#comment';
    const RDFS_SUBCLASS = 'http://www.w3.org/2000/01/rdf-schema#subClassOf';
    const OWL_CLASS = 'http://www.w3.org/2002/07/owl#Class';
    const SKOS_PREF_LABEL = 'http://www.w3.org/2004/02/skos/core#prefLabel';
    const SKOS_ALT_LABEL = 'http://www.w3.org/2004/02/skos/core#altLabel';

    // Custom TagTeam predicates
    const TAGTEAM_MARKER = 'http://tagteam.dev/ontology/core#semanticMarker';
    const TAGTEAM_POLARITY = 'http://tagteam.dev/ontology/core#polarity';
    const TAGTEAM_SALIENCE = 'http://tagteam.dev/ontology/core#defaultSalience';
    const TAGTEAM_RELATED = 'http://tagteam.dev/ontology/core#relatedProcess';

    // Iterate over all subjects
    for (const [subject, subjectTriples] of Object.entries(grouped)) {
        // Check if this is a Class
        const typeTriple = subjectTriples.find(t => t.predicate === RDF_TYPE);
        if (!typeTriple || typeTriple.object !== OWL_CLASS) {
            continue; // Skip non-class entities
        }

        // Extract concept properties
        const concept = {
            iri: subject,
            label: null,
            comment: null,
            markers: [],
            polarity: null,
            salience: null,
            subClassOf: null,
            relatedProcess: null
        };

        // Extract label (prefer rdfs:label, fallback to skos:prefLabel)
        const labelTriple = subjectTriples.find(t => t.predicate === RDFS_LABEL) ||
                           subjectTriples.find(t => t.predicate === SKOS_PREF_LABEL);
        if (labelTriple) {
            concept.label = labelTriple.object;
        } else {
            // Fallback: use local name from IRI
            concept.label = subject.split(/[#\/]/).pop();
        }

        // Extract comment
        const commentTriple = subjectTriples.find(t => t.predicate === RDFS_COMMENT);
        if (commentTriple) {
            concept.comment = commentTriple.object;
        }

        // Extract semantic markers
        const markerTriples = subjectTriples.filter(t => t.predicate === TAGTEAM_MARKER);
        concept.markers = markerTriples.map(t => t.object);

        // Add SKOS alternative labels as markers
        const altLabelTriples = subjectTriples.filter(t => t.predicate === SKOS_ALT_LABEL);
        concept.markers.push(...altLabelTriples.map(t => t.object));

        // Extract polarity
        const polarityTriple = subjectTriples.find(t => t.predicate === TAGTEAM_POLARITY);
        if (polarityTriple) {
            concept.polarity = parseFloat(polarityTriple.object);
        }

        // Extract salience
        const salienceTriple = subjectTriples.find(t => t.predicate === TAGTEAM_SALIENCE);
        if (salienceTriple) {
            concept.salience = parseFloat(salienceTriple.object);
        }

        // Extract subClassOf
        const subClassTriple = subjectTriples.find(t => t.predicate === RDFS_SUBCLASS);
        if (subClassTriple) {
            concept.subClassOf = subClassTriple.object;
        }

        // Extract relatedProcess (for semantic expansion)
        const relatedTriple = subjectTriples.find(t => t.predicate === TAGTEAM_RELATED);
        if (relatedTriple) {
            concept.relatedProcess = relatedTriple.object;
        }

        concepts.push(concept);
    }

    if (options.verbose) {
        console.log(`  Extracted ${concepts.length} concepts`);
    }

    return concepts;
}

// ========================================
// SEMANTIC EXPANSION
// ========================================

async function expandSemantics(concepts, expansionOntologyPath, mappings, options = {}) {
    if (options.verbose) {
        console.log(`\nExpanding semantics from: ${expansionOntologyPath}`);
    }

    // Parse expansion ontology
    const parser = new TTLParser();
    const expansionResult = await parser.parseFile(expansionOntologyPath);

    if (options.verbose) {
        console.log(`  Loaded ${expansionResult.triples.length} triples from expansion ontology`);
    }

    // Extract concepts from expansion ontology
    const expansionConcepts = extractConcepts(
        expansionResult.triples,
        expansionResult.prefixes,
        { verbose: false }
    );

    if (options.verbose) {
        console.log(`  Found ${expansionConcepts.length} expansion concepts`);
    }

    // Parse mappings (format: "source=target")
    const parsedMappings = mappings.map(mapping => {
        const [source, target] = mapping.split('=');
        return { source: source.trim(), target: target.trim() };
    });

    // Apply mappings
    for (const concept of concepts) {
        // Check if this concept has a mapping
        const mapping = parsedMappings.find(m => {
            return concept.iri.includes(m.source.split(':')[1]) ||
                   concept.label === m.source.split(':')[1];
        });

        if (mapping) {
            if (options.verbose) {
                console.log(`  Expanding ${concept.label} with ${mapping.target}`);
            }

            // Find target concept in expansion ontology
            const targetConcept = expansionConcepts.find(c => {
                return c.iri.includes(mapping.target.split(':')[1]) ||
                       c.label === mapping.target.split(':')[1];
            });

            if (targetConcept) {
                // Traverse hierarchy and collect all labels
                const expandedTerms = traverseHierarchy(
                    targetConcept,
                    expansionConcepts,
                    expansionResult.triples
                );

                // Add expanded terms to markers (avoid duplicates)
                const existingMarkers = new Set(concept.markers);
                for (const term of expandedTerms) {
                    if (!existingMarkers.has(term)) {
                        concept.markers.push(term);
                    }
                }

                // Add metadata
                concept.expansionSource = targetConcept.iri;
                concept.expandedTermCount = expandedTerms.length;

                if (options.verbose) {
                    console.log(`    Added ${expandedTerms.length} expanded terms`);
                }
            }
        }
    }

    return concepts;
}

function traverseHierarchy(rootConcept, allConcepts, triples) {
    const labels = [rootConcept.label];
    const visited = new Set([rootConcept.iri]);
    const queue = [rootConcept.iri];

    const RDFS_SUBCLASS = 'http://www.w3.org/2000/01/rdf-schema#subClassOf';

    while (queue.length > 0) {
        const currentIri = queue.shift();

        // Find all subclasses of current concept
        const subClassTriples = triples.filter(t =>
            t.predicate === RDFS_SUBCLASS &&
            t.object === currentIri &&
            !visited.has(t.subject)
        );

        for (const triple of subClassTriples) {
            visited.add(triple.subject);
            queue.push(triple.subject);

            // Find the concept and add its label
            const subConcept = allConcepts.find(c => c.iri === triple.subject);
            if (subConcept && subConcept.label) {
                labels.push(subConcept.label);
            }
        }
    }

    return labels;
}

// ========================================
// MANIFEST GENERATION
// ========================================

function generateManifest(concepts, metadata, options = {}) {
    const manifest = {
        version: '3.0.0',
        source: metadata.source,
        compiledAt: metadata.compiledAt,
        concepts: concepts.map(c => {
            const conceptData = {
                iri: c.iri,
                label: c.label,
                markers: c.markers
            };

            // Add optional fields only if present
            if (c.comment) conceptData.comment = c.comment;
            if (c.polarity !== null) conceptData.polarity = c.polarity;
            if (c.salience !== null) conceptData.salience = c.salience;
            if (c.subClassOf) conceptData.subClassOf = c.subClassOf;
            if (c.relatedProcess) conceptData.relatedProcess = c.relatedProcess;
            if (c.expansionSource) conceptData.expansionSource = c.expansionSource;
            if (c.expandedTermCount) conceptData.expandedTermCount = c.expandedTermCount;

            return conceptData;
        }),
        metadata: {
            conceptCount: concepts.length,
            totalMarkers: concepts.reduce((sum, c) => sum + c.markers.length, 0),
            expanded: metadata.expanded || false,
            expansionSource: metadata.expansionSource || null
        }
    };

    return manifest;
}

// ========================================
// MAIN EXECUTION
// ========================================

async function main() {
    const args = parseArgs(process.argv);

    // Show help
    if (args.help) {
        printHelp();
        process.exit(0);
    }

    // Validate input
    if (!args.input) {
        console.error('Error: No input file specified');
        console.error('Usage: tagteam-compile <input.ttl> [options]');
        console.error('Run with --help for more information');
        process.exit(1);
    }

    // Resolve paths
    const inputPath = path.resolve(args.input);
    const outputPath = args.output
        ? path.resolve(args.output)
        : inputPath.replace(/\.(ttl|owl|rdf)$/, '.json');

    // Check if input exists
    if (!fs.existsSync(inputPath)) {
        console.error(`Error: Input file not found: ${inputPath}`);
        process.exit(1);
    }

    console.log('TagTeam Ontology Compiler v3.0.0-alpha.1\n');
    console.log(`Input:  ${inputPath}`);
    console.log(`Output: ${outputPath}`);
    if (args.expandSemantics) {
        console.log(`Expansion: ${args.expandSemantics}`);
        console.log(`Mappings: ${args.map.join(', ')}`);
    }
    console.log('');

    try {
        // Parse input ontology
        console.log('Parsing ontology...');
        const parser = new TTLParser();
        const startTime = Date.now();
        const result = await parser.parseFile(inputPath);
        const parseTime = Date.now() - startTime;

        if (args.verbose) {
            console.log(`  Parsed ${result.triples.length} triples in ${parseTime}ms`);
            console.log(`  Found ${Object.keys(result.prefixes).length} prefix declarations`);
        }

        // Extract concepts
        console.log('Extracting concepts...');
        let concepts = extractConcepts(result.triples, result.prefixes, {
            verbose: args.verbose
        });

        // Semantic expansion
        let expanded = false;
        let expansionSource = null;

        if (args.expandSemantics) {
            console.log('Applying semantic expansion...');
            const expansionPath = path.resolve(args.expandSemantics);

            if (!fs.existsSync(expansionPath)) {
                console.error(`Error: Expansion ontology not found: ${expansionPath}`);
                process.exit(1);
            }

            concepts = await expandSemantics(concepts, expansionPath, args.map, {
                verbose: args.verbose
            });

            expanded = true;
            expansionSource = path.basename(args.expandSemantics);
        }

        // Generate manifest
        console.log('Generating manifest...');
        const manifest = generateManifest(concepts, {
            source: path.basename(inputPath),
            compiledAt: new Date().toISOString(),
            expanded,
            expansionSource
        }, {
            verbose: args.verbose
        });

        // Write output
        console.log('Writing output...');
        const jsonOutput = args.minify
            ? JSON.stringify(manifest)
            : JSON.stringify(manifest, null, 2);

        fs.writeFileSync(outputPath, jsonOutput, 'utf8');

        // Success summary
        const inputSize = fs.statSync(inputPath).size;
        const outputSize = fs.statSync(outputPath).size;
        const reduction = ((1 - outputSize / inputSize) * 100).toFixed(1);

        console.log('\n✓ Compilation successful!\n');
        console.log('Statistics:');
        console.log(`  Concepts extracted: ${manifest.metadata.conceptCount}`);
        console.log(`  Total markers: ${manifest.metadata.totalMarkers}`);
        console.log(`  Input size: ${(inputSize / 1024).toFixed(1)} KB`);
        console.log(`  Output size: ${(outputSize / 1024).toFixed(1)} KB`);
        console.log(`  Size reduction: ${reduction}%`);
        if (expanded) {
            console.log(`  Semantic expansion: ✓ (${expansionSource})`);
        }

        process.exit(0);

    } catch (error) {
        console.error('\n✗ Compilation failed:\n');
        console.error(error.message);
        if (args.verbose) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Run CLI
main();
