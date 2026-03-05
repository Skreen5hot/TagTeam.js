#!/usr/bin/env node
/**
 * TagTeam.js Bundle Builder
 *
 * Creates a single-file d3.js-style bundle from source files
 *
 * Usage: node build.js          → dist/tagteam.js (full bundle)
 *        node build.js --core   → dist/tagteam-core.js (core only)
 * Output: dist/tagteam.js or dist/tagteam-core.js
 */

// ============================================================================
// TWO-BUNDLE ARCHITECTURE
// ============================================================================
// This build produces TWO bundles from a single script:
//
//   tagteam.js      — Full bundle (NLP + graph + ontology + values/ethical)
//   tagteam-core.js — Core bundle (NLP + graph + ontology, NO values/ethical)
//
// The core bundle exists because external users who want pure NLP-to-ontology
// parsing should not ship an ethical profiler. The values layer was the IEE
// collaboration's contribution and is optional for non-IEE consumers.
//
// DO NOT delete tagteam-core.js or remove the --core flag without checking
// with downstream consumers. The core bundle has an automated CI gate
// (tests/bundle/core-bundle.test.js) that will fail if it breaks.
//
// Usage:
//   node scripts/build.js          → dist/tagteam.js (full)
//   node scripts/build.js --core   → dist/tagteam-core.js (core only)
//   npm run build:all              → both
// ============================================================================

const CORE_ONLY = process.argv.includes('--core');
const OUTPUT_NAME = CORE_ONLY ? 'tagteam-core.js' : 'tagteam.js';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Auto-increment build number
const buildNumberPath = path.join(__dirname, 'build-number.json');
let buildNumber = 0;
try {
  const data = JSON.parse(fs.readFileSync(buildNumberPath, 'utf8'));
  buildNumber = (data.build || 0) + 1;
} catch (e) {
  buildNumber = 1;
}
fs.writeFileSync(buildNumberPath, JSON.stringify({ build: buildNumber }, null, 2) + '\n', 'utf8');

// Get git hash
let gitHash = 'unknown';
try {
  gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch (e) { /* not in git repo */ }

const buildTimestamp = new Date().toISOString();
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const pkgVersion = pkg.version;
const buildInfo = `build ${buildNumber} | ${gitHash} | ${buildTimestamp}`;

console.log(`🔨 Building TagTeam.js ${CORE_ONLY ? 'core' : 'full'} bundle...`);
console.log(`   Build #${buildNumber} (${gitHash} @ ${buildTimestamp})\n`);

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
  console.log('✅ Created dist/ directory');
}

// Read source files
console.log('📖 Reading source files...');
const lexiconPath = path.join(__dirname, '..', 'src', 'core', 'lexicon.js');
const posTaggerPath = path.join(__dirname, '..', 'src', 'core', 'POSTagger.js');
const patternMatcherPath = path.join(__dirname, '..', 'src', 'core', 'PatternMatcher.js');
const matchingStrategiesPath = path.join(__dirname, '..', 'src', 'core', 'MatchingStrategies.js');
const compromisePath = path.join(__dirname, '..', 'node_modules', 'compromise', 'builds', 'compromise.js');
const contextAnalyzerPath = path.join(__dirname, '..', 'src', 'analyzers', 'ContextAnalyzer.js');
const certaintyAnalyzerPath = path.join(__dirname, '..', 'src', 'analyzers', 'CertaintyAnalyzer.js');
const valueMatcherPath = path.join(__dirname, '..', 'src', 'analyzers', 'ValueMatcher.js');
const valueScorerPath = path.join(__dirname, '..', 'src', 'analyzers', 'ValueScorer.js');
const ethicalProfilerPath = path.join(__dirname, '..', 'src', 'analyzers', 'EthicalProfiler.js');
const semanticExtractorPath = path.join(__dirname, '..', 'src', 'core', 'SemanticRoleExtractor.js');

// Core NLP modules
const lemmatizerPath = path.join(__dirname, '..', 'src', 'core', 'Lemmatizer.js');

// Phase 4: Graph modules (Two-Tier Architecture v2.3)
const tokenizerPath = path.join(__dirname, '..', 'src', 'graph', 'Tokenizer.js');
const npChunkerPath = path.join(__dirname, '..', 'src', 'graph', 'NPChunker.js');
const realWorldEntityFactoryPath = path.join(__dirname, '..', 'src', 'graph', 'RealWorldEntityFactory.js');
const entityExtractorPath = path.join(__dirname, '..', 'src', 'graph', 'EntityExtractor.js');
const actExtractorPath = path.join(__dirname, '..', 'src', 'graph', 'ActExtractor.js');
const roleDetectorPath = path.join(__dirname, '..', 'src', 'graph', 'RoleDetector.js');
const semanticGraphBuilderPath = path.join(__dirname, '..', 'src', 'graph', 'SemanticGraphBuilder.js');
const jsonldSerializerPath = path.join(__dirname, '..', 'src', 'graph', 'JSONLDSerializer.js');

// v2.3: New factories for BFO/CCO compliance
const scarcityAssertionFactoryPath = path.join(__dirname, '..', 'src', 'graph', 'ScarcityAssertionFactory.js');
const directiveExtractorPath = path.join(__dirname, '..', 'src', 'graph', 'DirectiveExtractor.js');
const objectAggregateFactoryPath = path.join(__dirname, '..', 'src', 'graph', 'ObjectAggregateFactory.js');

// v2.4: Quality factory for entity qualifiers
const qualityFactoryPath = path.join(__dirname, '..', 'src', 'graph', 'QualityFactory.js');

// Week 2: Assertion events and GIT-Minimal integration
const assertionEventBuilderPath = path.join(__dirname, '..', 'src', 'graph', 'AssertionEventBuilder.js');
const contextManagerPath = path.join(__dirname, '..', 'src', 'graph', 'ContextManager.js');
const informationStaircaseBuilderPath = path.join(__dirname, '..', 'src', 'graph', 'InformationStaircaseBuilder.js');

// Phase 2: Domain configuration loader
const domainConfigLoaderPath = path.join(__dirname, '..', 'src', 'graph', 'DomainConfigLoader.js');

// Week 3: SHACL validation and complexity budget
const shmlValidatorPath = path.join(__dirname, '..', 'src', 'graph', 'SHMLValidator.js');
const complexityBudgetPath = path.join(__dirname, '..', 'src', 'graph', 'ComplexityBudget.js');

// Phase 5: Ambiguity detection
const ambiguityReportPath = path.join(__dirname, '..', 'src', 'graph', 'AmbiguityReport.js');
const ambiguityDetectorPath = path.join(__dirname, '..', 'src', 'graph', 'AmbiguityDetector.js');

// Phase 6: Interpretation Lattice modules
const selectionalPreferencesPath = path.join(__dirname, '..', 'src', 'graph', 'SelectionalPreferences.js');
const ambiguityResolverPath = path.join(__dirname, '..', 'src', 'graph', 'AmbiguityResolver.js');
const interpretationLatticePath = path.join(__dirname, '..', 'src', 'graph', 'InterpretationLattice.js');
const alternativeGraphBuilderPath = path.join(__dirname, '..', 'src', 'graph', 'AlternativeGraphBuilder.js');

// Phase 6.5: Ontology loading modules
const turtleParserPath = path.join(__dirname, '..', 'src', 'ontology', 'TurtleParser.js');
const ontologyManagerPath = path.join(__dirname, '..', 'src', 'ontology', 'OntologyManager.js');
const valueNetAdapterPath = path.join(__dirname, '..', 'src', 'ontology', 'ValueNetAdapter.js');
const bridgeOntologyLoaderPath = path.join(__dirname, '..', 'src', 'ontology', 'BridgeOntologyLoader.js');

// Phase 6.6: General-purpose ontology text tagger
const propertyMapperPath = path.join(__dirname, '..', 'src', 'ontology', 'PropertyMapper.js');
const ontologyTextTaggerPath = path.join(__dirname, '..', 'src', 'ontology', 'OntologyTextTagger.js');

// Phase 7.1: Source attribution detection
const sourceAttributionDetectorPath = path.join(__dirname, '..', 'src', 'graph', 'SourceAttributionDetector.js');

// Phase 7 v7: Sentence mode classifier (stative predication)
const sentenceModeClassifierPath = path.join(__dirname, '..', 'src', 'graph', 'SentenceModeClassifier.js');

// Phase 7 v7: Complex designator detector (greedy NER)
const complexDesignatorDetectorPath = path.join(__dirname, '..', 'src', 'graph', 'ComplexDesignatorDetector.js');

// Phase 9.3: Combined validation report
const combinedValidationReportPath = path.join(__dirname, '..', 'src', 'graph', 'CombinedValidationReport.js');

// v2 Phase 1: Clause segmenter
const clauseSegmenterPath = path.join(__dirname, '..', 'src', 'graph', 'ClauseSegmenter.js');

// v2 Phase 2: Dependency parser
const dependencyParserPath = path.join(__dirname, '..', 'src', 'core', 'DependencyParser.js');
const depTreePath = path.join(__dirname, '..', 'src', 'core', 'DepTree.js');
const binaryModelLoaderPath = path.join(__dirname, '..', 'src', 'core', 'BinaryModelLoader.js');

// v2 Phase 4: Ditransitive arc corrector
const depTreeCorrectorPath = path.join(__dirname, '..', 'src', 'core', 'DepTreeCorrector.js');

// §9.5: Genericity detector
const genericityDetectorPath = path.join(__dirname, '..', 'src', 'graph', 'GenericityDetector.js');

// v2 Phase 0: Core contracts for tree pipeline browser support
const unicodeNormalizerPath = path.join(__dirname, '..', 'src', 'core', 'UnicodeNormalizer.js');
const roleMappingContractPath = path.join(__dirname, '..', 'src', 'core', 'RoleMappingContract.js');

// v2 Phase 1: PerceptronTagger for tree pipeline browser support
const perceptronTaggerPath = path.join(__dirname, '..', 'src', 'core', 'PerceptronTagger.js');

// v2 Phase 3A: Tree-based extractors
const treeEntityExtractorPath = path.join(__dirname, '..', 'src', 'graph', 'TreeEntityExtractor.js');
const treeActExtractorPath = path.join(__dirname, '..', 'src', 'graph', 'TreeActExtractor.js');
const treeRoleMapperPath = path.join(__dirname, '..', 'src', 'graph', 'TreeRoleMapper.js');

// v2 Phase 3A: GazetteerNER for entity type lookup
const gazetteerNERPath = path.join(__dirname, '..', 'src', 'graph', 'GazetteerNER.js');

// v2 Phase 3B: Confidence annotator
const confidenceAnnotatorPath = path.join(__dirname, '..', 'src', 'graph', 'ConfidenceAnnotator.js');

// Security modules
const inputValidatorPath = path.join(__dirname, '..', 'src', 'security', 'input-validator.js');
const ontologyIntegrityPath = path.join(__dirname, '..', 'src', 'security', 'ontology-integrity.js');
const semanticValidatorsPath = path.join(__dirname, '..', 'src', 'security', 'semantic-validators.js');
const outputSanitizerPath = path.join(__dirname, '..', 'src', 'security', 'output-sanitizer.js');
const auditLoggerPath = path.join(__dirname, '..', 'src', 'security', 'audit-logger.js');

let lexicon = fs.readFileSync(lexiconPath, 'utf8');
let posTagger = fs.readFileSync(posTaggerPath, 'utf8');
let patternMatcher = fs.readFileSync(patternMatcherPath, 'utf8');
let matchingStrategies = fs.readFileSync(matchingStrategiesPath, 'utf8');
let compromise = fs.readFileSync(compromisePath, 'utf8');
let contextAnalyzer = CORE_ONLY ? '' : fs.readFileSync(contextAnalyzerPath, 'utf8');
let certaintyAnalyzer = CORE_ONLY ? '' : fs.readFileSync(certaintyAnalyzerPath, 'utf8');
let valueMatcher = CORE_ONLY ? '' : fs.readFileSync(valueMatcherPath, 'utf8');
let valueScorer = CORE_ONLY ? '' : fs.readFileSync(valueScorerPath, 'utf8');
let ethicalProfiler = CORE_ONLY ? '' : fs.readFileSync(ethicalProfilerPath, 'utf8');
let semanticExtractor = fs.readFileSync(semanticExtractorPath, 'utf8');
let lemmatizerSrc = fs.readFileSync(lemmatizerPath, 'utf8');

console.log(`  ✓ lexicon.js (${(lexicon.length / 1024 / 1024).toFixed(2)} MB)`);
console.log(`  ✓ POSTagger.js (${(posTagger.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ Compromise.js (NLP) (${(compromise.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ MatchingStrategies.js (${(matchingStrategies.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ PatternMatcher.js (${(patternMatcher.length / 1024).toFixed(2)} KB)`);
if (!CORE_ONLY) {
  console.log(`  ✓ ContextAnalyzer.js (${(contextAnalyzer.length / 1024).toFixed(2)} KB)`);
  console.log(`  ✓ CertaintyAnalyzer.js (${(certaintyAnalyzer.length / 1024).toFixed(2)} KB)`);
  console.log(`  ✓ ValueMatcher.js (${(valueMatcher.length / 1024).toFixed(2)} KB)`);
  console.log(`  ✓ ValueScorer.js (${(valueScorer.length / 1024).toFixed(2)} KB)`);
  console.log(`  ✓ EthicalProfiler.js (${(ethicalProfiler.length / 1024).toFixed(2)} KB)`);
} else {
  console.log('  ⊘ Skipped 5 values/ethical analyzer files (--core)');
}
console.log(`  ✓ SemanticRoleExtractor.js (${(semanticExtractor.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ Lemmatizer.js (${(lemmatizerSrc.length / 1024).toFixed(2)} KB)`);

// Read Phase 4 graph modules (Two-Tier Architecture v2.3)
console.log('\n📖 Reading Phase 4 graph modules (Two-Tier v2.3)...');
let tokenizer = fs.readFileSync(tokenizerPath, 'utf8');
let npChunker = fs.readFileSync(npChunkerPath, 'utf8');
let realWorldEntityFactory = fs.readFileSync(realWorldEntityFactoryPath, 'utf8');
let entityExtractor = fs.readFileSync(entityExtractorPath, 'utf8');
let actExtractor = fs.readFileSync(actExtractorPath, 'utf8');
let roleDetector = fs.readFileSync(roleDetectorPath, 'utf8');
let semanticGraphBuilder = fs.readFileSync(semanticGraphBuilderPath, 'utf8');
let jsonldSerializer = fs.readFileSync(jsonldSerializerPath, 'utf8');

// v2.3 factories
let scarcityAssertionFactory = fs.readFileSync(scarcityAssertionFactoryPath, 'utf8');
let directiveExtractor = fs.readFileSync(directiveExtractorPath, 'utf8');
let objectAggregateFactory = fs.readFileSync(objectAggregateFactoryPath, 'utf8');

// v2.4 factories
let qualityFactory = fs.readFileSync(qualityFactoryPath, 'utf8');

// Week 2 modules
let assertionEventBuilder = CORE_ONLY ? '' : fs.readFileSync(assertionEventBuilderPath, 'utf8');
let contextManager = fs.readFileSync(contextManagerPath, 'utf8');
let informationStaircaseBuilder = fs.readFileSync(informationStaircaseBuilderPath, 'utf8');

// Phase 2: Domain config loader
let domainConfigLoader = fs.readFileSync(domainConfigLoaderPath, 'utf8');

// Week 3 modules
let shmlValidator = fs.readFileSync(shmlValidatorPath, 'utf8');
let complexityBudget = fs.readFileSync(complexityBudgetPath, 'utf8');

// Phase 5: Ambiguity detection
let ambiguityReport = fs.readFileSync(ambiguityReportPath, 'utf8');
let ambiguityDetector = fs.readFileSync(ambiguityDetectorPath, 'utf8');

// Phase 6: Interpretation Lattice
let selectionalPreferences = fs.readFileSync(selectionalPreferencesPath, 'utf8');
let ambiguityResolver = fs.readFileSync(ambiguityResolverPath, 'utf8');
let interpretationLattice = fs.readFileSync(interpretationLatticePath, 'utf8');
let alternativeGraphBuilder = fs.readFileSync(alternativeGraphBuilderPath, 'utf8');

// Phase 6.5: Ontology loading
let turtleParser = fs.readFileSync(turtleParserPath, 'utf8');
let ontologyManager = fs.readFileSync(ontologyManagerPath, 'utf8');
let valueNetAdapter = CORE_ONLY ? '' : fs.readFileSync(valueNetAdapterPath, 'utf8');
let bridgeOntologyLoader = CORE_ONLY ? '' : fs.readFileSync(bridgeOntologyLoaderPath, 'utf8');

// Phase 6.6: General-purpose tagger
let propertyMapper = fs.readFileSync(propertyMapperPath, 'utf8');
let ontologyTextTagger = fs.readFileSync(ontologyTextTaggerPath, 'utf8');

// Phase 7.1: Source attribution
let sourceAttributionDetector = fs.readFileSync(sourceAttributionDetectorPath, 'utf8');

// Phase 7 v7: Sentence mode classifier
let sentenceModeClassifier = fs.readFileSync(sentenceModeClassifierPath, 'utf8');

// Phase 7 v7: Complex designator detector
let complexDesignatorDetector = fs.readFileSync(complexDesignatorDetectorPath, 'utf8');

// Phase 9.3: Combined validation report
let combinedValidationReport = fs.readFileSync(combinedValidationReportPath, 'utf8');

// v2 Phase 1: Clause segmenter
let clauseSegmenter = fs.readFileSync(clauseSegmenterPath, 'utf8');

// v2 Phase 2: Dependency parser
let dependencyParser = fs.readFileSync(dependencyParserPath, 'utf8');
let depTree = fs.readFileSync(depTreePath, 'utf8');
let binaryModelLoader = fs.readFileSync(binaryModelLoaderPath, 'utf8');

// v2 Phase 4: Ditransitive arc corrector
let depTreeCorrector = fs.readFileSync(depTreeCorrectorPath, 'utf8');

// §9.5: Genericity detector
let genericityDetector = fs.readFileSync(genericityDetectorPath, 'utf8');

// v2 Phase 0: Core contracts for tree pipeline browser support
let unicodeNormalizer = fs.readFileSync(unicodeNormalizerPath, 'utf8');
let roleMappingContract = fs.readFileSync(roleMappingContractPath, 'utf8');

// v2 Phase 1: PerceptronTagger for tree pipeline browser support
let perceptronTagger2 = fs.readFileSync(perceptronTaggerPath, 'utf8');

// v2 Phase 3A: Tree-based extractors
let treeEntityExtractor = fs.readFileSync(treeEntityExtractorPath, 'utf8');
let treeActExtractor = fs.readFileSync(treeActExtractorPath, 'utf8');
let treeRoleMapper = fs.readFileSync(treeRoleMapperPath, 'utf8');

// v2 Phase 3A: GazetteerNER
let gazetteerNER = fs.readFileSync(gazetteerNERPath, 'utf8');

// v2 Phase 3B: Confidence annotator
let confidenceAnnotator = fs.readFileSync(confidenceAnnotatorPath, 'utf8');

// Security modules
let inputValidator = fs.readFileSync(inputValidatorPath, 'utf8');
let ontologyIntegrity = fs.readFileSync(ontologyIntegrityPath, 'utf8');
let semanticValidators = fs.readFileSync(semanticValidatorsPath, 'utf8');
let outputSanitizer = fs.readFileSync(outputSanitizerPath, 'utf8');
let auditLogger = fs.readFileSync(auditLoggerPath, 'utf8');

console.log(`  ✓ Tokenizer.js (${(tokenizer.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ NPChunker.js (${(npChunker.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ RealWorldEntityFactory.js (${(realWorldEntityFactory.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ EntityExtractor.js (${(entityExtractor.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ ActExtractor.js (${(actExtractor.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ RoleDetector.js (${(roleDetector.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ SemanticGraphBuilder.js (${(semanticGraphBuilder.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ JSONLDSerializer.js (${(jsonldSerializer.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ ScarcityAssertionFactory.js (${(scarcityAssertionFactory.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ DirectiveExtractor.js (${(directiveExtractor.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ ObjectAggregateFactory.js (${(objectAggregateFactory.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ QualityFactory.js (${(qualityFactory.length / 1024).toFixed(2)} KB)`);
if (!CORE_ONLY) console.log(`  ✓ AssertionEventBuilder.js (${(assertionEventBuilder.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ ContextManager.js (${(contextManager.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ InformationStaircaseBuilder.js (${(informationStaircaseBuilder.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ DomainConfigLoader.js (${(domainConfigLoader.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ SHMLValidator.js (${(shmlValidator.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ ComplexityBudget.js (${(complexityBudget.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ AmbiguityReport.js (${(ambiguityReport.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ AmbiguityDetector.js (${(ambiguityDetector.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ SelectionalPreferences.js (${(selectionalPreferences.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ AmbiguityResolver.js (${(ambiguityResolver.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ InterpretationLattice.js (${(interpretationLattice.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ AlternativeGraphBuilder.js (${(alternativeGraphBuilder.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ TurtleParser.js (${(turtleParser.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ OntologyManager.js (${(ontologyManager.length / 1024).toFixed(2)} KB)`);
if (!CORE_ONLY) {
  console.log(`  ✓ ValueNetAdapter.js (${(valueNetAdapter.length / 1024).toFixed(2)} KB)`);
  console.log(`  ✓ BridgeOntologyLoader.js (${(bridgeOntologyLoader.length / 1024).toFixed(2)} KB)`);
}
console.log(`  ✓ PropertyMapper.js (${(propertyMapper.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ OntologyTextTagger.js (${(ontologyTextTagger.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ SourceAttributionDetector.js (${(sourceAttributionDetector.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ SentenceModeClassifier.js (${(sentenceModeClassifier.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ ComplexDesignatorDetector.js (${(complexDesignatorDetector.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ CombinedValidationReport.js (${(combinedValidationReport.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ input-validator.js (${(inputValidator.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ ontology-integrity.js (${(ontologyIntegrity.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ semantic-validators.js (${(semanticValidators.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ output-sanitizer.js (${(outputSanitizer.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ audit-logger.js (${(auditLogger.length / 1024).toFixed(2)} KB)`);

// Read data files for Week 2b (values layer — skipped in --core mode)
let valueDefinitions = '{}', frameValueBoosts = '{}', conflictPairs = '{}';
if (!CORE_ONLY) {
  console.log('\n📖 Reading Week 2b data files...');
  const valueDefinitionsPath = path.join(__dirname, '..', 'iee-collaboration', 'from-iee', 'data', 'value-definitions-comprehensive.json');
  const frameValueBoostsPath = path.join(__dirname, '..', 'iee-collaboration', 'from-iee', 'data', 'frame-value-boosts.json');
  const conflictPairsPath = path.join(__dirname, '..', 'iee-collaboration', 'from-iee', 'data', 'conflict-pairs.json');

  valueDefinitions = fs.readFileSync(valueDefinitionsPath, 'utf8');
  frameValueBoosts = fs.readFileSync(frameValueBoostsPath, 'utf8');
  conflictPairs = fs.readFileSync(conflictPairsPath, 'utf8');

  console.log(`  ✓ value-definitions-comprehensive.json (${(valueDefinitions.length / 1024).toFixed(2)} KB)`);
  console.log(`  ✓ frame-value-boosts.json (${(frameValueBoosts.length / 1024).toFixed(2)} KB)`);
  console.log(`  ✓ conflict-pairs.json (${(conflictPairs.length / 1024).toFixed(2)} KB)`);
} else {
  console.log('\n⊘ Skipped Week 2b data files (--core)');
}

// Read model files for embedding into bundle
console.log('\n📖 Reading pipeline models for embedding...');
const embeddedPosModel = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'pos-weights-pruned.json'), 'utf8');
const embeddedDepModel = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'dep-weights-pruned.json'), 'utf8');
const embeddedCalibration = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'dep-calibration.json'), 'utf8');
const gazetteersDir = path.join(__dirname, '..', 'src', 'data', 'gazetteers');
const embeddedGazNames = fs.readFileSync(path.join(gazetteersDir, 'names.json'), 'utf8');
const embeddedGazOrgs = fs.readFileSync(path.join(gazetteersDir, 'organizations.json'), 'utf8');
const embeddedGazPlaces = fs.readFileSync(path.join(gazetteersDir, 'places.json'), 'utf8');
console.log(`  ✓ pos-weights-pruned.json (${(embeddedPosModel.length / 1024 / 1024).toFixed(2)} MB)`);
console.log(`  ✓ dep-weights-pruned.json (${(embeddedDepModel.length / 1024 / 1024).toFixed(2)} MB)`);
console.log(`  ✓ dep-calibration.json (${(embeddedCalibration.length / 1024).toFixed(2)} KB)`);
console.log(`  ✓ gazetteers: names.json, organizations.json, places.json`);

// Strip IIFE wrappers from SemanticRoleExtractor if present
console.log('\n🔧 Processing source files...');
if (semanticExtractor.includes('(function(window)')) {
  // Remove the IIFE wrapper and window export
  semanticExtractor = semanticExtractor
    .replace(/^\s*\/\*![^]*?\*\/\s*\n/, '') // Remove header comment
    .replace(/^\s*\(function\(window\)\s*\{\s*\n/m, '') // Remove opening IIFE
    .replace(/\s*window\.SemanticRoleExtractor\s*=\s*SemanticRoleExtractor;\s*\n/gm, '') // Remove window export
    .replace(/\}\)\(window\);\s*$/gm, ''); // Remove closing IIFE
  console.log('  ✓ Stripped IIFE wrapper from SemanticRoleExtractor');
}

// Replace window references in SemanticRoleExtractor with _global
if (semanticExtractor.includes('window.VALUE_DEFINITIONS')) {
  semanticExtractor = semanticExtractor.replace(/window\./g, '_global.');
  console.log('  ✓ Fixed window references in SemanticRoleExtractor');
}

// Fix POSTagger global variable leak (word = ret[i] should be var word = ret[i])
if (posTagger.includes('word = ret[i]')) {
  posTagger = posTagger.replace(/(\s+)word = ret\[i\];/g, '$1var word = ret[i];');
  console.log('  ✓ Fixed global variable leak in POSTagger');
}

// Replace window references in lexicon with _global for cross-platform compatibility
if (lexicon.includes('window.POSTAGGER_LEXICON')) {
  lexicon = lexicon.replace(/window\.POSTAGGER_LEXICON/g, '_global.POSTAGGER_LEXICON');
  console.log('  ✓ Fixed lexicon for cross-platform compatibility');
}

// Strip UMD wrapper from PatternMatcher (Week 3 enhancement)
if (patternMatcher.includes('(function(root, factory)')) {
  // Extract the factory function content
  const factoryMatch = patternMatcher.match(/}\(typeof self[^}]+function\(nlp\)\s*\{([\s\S]+)\}\)\);/);
  if (factoryMatch) {
    patternMatcher = factoryMatch[1];
    console.log('  ✓ Stripped UMD wrapper from PatternMatcher');
  }
}

// Strip UMD wrapper from MatchingStrategies
if (matchingStrategies.includes('(function(root, factory)')) {
  const factoryMatch = matchingStrategies.match(/}\(typeof self[^}]+function\(\)\s*\{([\s\S]+)\}\)\);/);
  if (factoryMatch) {
    matchingStrategies = factoryMatch[1];
    console.log('  ✓ Stripped UMD wrapper from MatchingStrategies');
  }
}

// Strip UMD wrapper from ContextAnalyzer
if (contextAnalyzer.includes('(function(root, factory)')) {
  const factoryMatch = contextAnalyzer.match(/}\(typeof self[^}]+function\(PatternMatcher\)\s*\{([\s\S]+)\}\)\);/);
  if (factoryMatch) {
    contextAnalyzer = factoryMatch[1];
    console.log('  ✓ Stripped UMD wrapper from ContextAnalyzer');
  }
}

// Strip UMD wrapper from ValueMatcher
if (valueMatcher.includes('(function(root, factory)')) {
  const factoryMatch = valueMatcher.match(/}\(typeof self[^}]+function\(PatternMatcher\)\s*\{([\s\S]+)\}\)\);/);
  if (factoryMatch) {
    valueMatcher = factoryMatch[1];
    console.log('  ✓ Stripped UMD wrapper from ValueMatcher');
  }
}

// Strip UMD wrapper from ValueScorer
if (valueScorer.includes('(function(root, factory)')) {
  const factoryMatch = valueScorer.match(/}\(typeof self[^}]+function\(\)\s*\{([\s\S]+)\}\)\);/);
  if (factoryMatch) {
    valueScorer = factoryMatch[1];
    console.log('  ✓ Stripped UMD wrapper from ValueScorer');
  }
}

// Strip UMD wrapper from EthicalProfiler
if (ethicalProfiler.includes('(function(root, factory)')) {
  const factoryMatch = ethicalProfiler.match(/}\(typeof self[^}]+function\(\)\s*\{([\s\S]+)\}\)\);/);
  if (factoryMatch) {
    ethicalProfiler = factoryMatch[1];
    console.log('  ✓ Stripped UMD wrapper from EthicalProfiler');
  }
}

// Phase 7.2: Strip CommonJS from CertaintyAnalyzer
certaintyAnalyzer = certaintyAnalyzer.replace(/module\.exports\s*=\s*\w+;\s*\n?/g, '');
certaintyAnalyzer = certaintyAnalyzer.replace(/'use strict';\s*\n?/g, '');
console.log('  ✓ Processed CertaintyAnalyzer for browser');

// Phase 7.1: Strip CommonJS from SourceAttributionDetector
sourceAttributionDetector = sourceAttributionDetector.replace(/module\.exports\s*=\s*\w+;\s*\n?/g, '');
sourceAttributionDetector = sourceAttributionDetector.replace(/'use strict';\s*\n?/g, '');
console.log('  ✓ Processed SourceAttributionDetector for browser');

// Phase 7 v7: Strip CommonJS from SentenceModeClassifier
sentenceModeClassifier = sentenceModeClassifier.replace(/module\.exports\s*=\s*\w+;\s*\n?/g, '');
sentenceModeClassifier = sentenceModeClassifier.replace(/'use strict';\s*\n?/g, '');
console.log('  ✓ Processed SentenceModeClassifier for browser');

// Phase 7 v7: Strip CommonJS from ComplexDesignatorDetector
complexDesignatorDetector = complexDesignatorDetector.replace(/module\.exports\s*=\s*\w+;\s*\n?/g, '');
complexDesignatorDetector = complexDesignatorDetector.replace(/'use strict';\s*\n?/g, '');
console.log('  ✓ Processed ComplexDesignatorDetector for browser');

// Phase 9.3: Strip CommonJS from CombinedValidationReport
combinedValidationReport = combinedValidationReport.replace(/module\.exports\s*=\s*\w+;\s*\n?/g, '');
combinedValidationReport = combinedValidationReport.replace(/'use strict';\s*\n?/g, '');
console.log('  ✓ Processed CombinedValidationReport for browser');

// Security modules: Strip CommonJS exports (ontology-integrity excluded — requires Node crypto/fs)
inputValidator = inputValidator.replace(/module\.exports\s*=\s*\{[^}]*\};\s*\n?/g, '');
inputValidator = inputValidator.replace(/'use strict';\s*\n?/g, '');
semanticValidators = semanticValidators.replace(/module\.exports\s*=\s*\{[^}]*\};\s*\n?/g, '');
semanticValidators = semanticValidators.replace(/'use strict';\s*\n?/g, '');
outputSanitizer = outputSanitizer.replace(/module\.exports\s*=\s*\{[^}]*\};\s*\n?/g, '');
outputSanitizer = outputSanitizer.replace(/'use strict';\s*\n?/g, '');
outputSanitizer = stripBundleNodeCode(outputSanitizer, 'OutputSanitizer');
auditLogger = auditLogger.replace(/module\.exports\s*=\s*\{[^}]*\};\s*\n?/g, '');
auditLogger = auditLogger.replace(/'use strict';\s*\n?/g, '');
console.log('  ✓ Processed security modules for browser (4 of 5; ontology-integrity is Node-only)');

// Process Phase 4 graph modules - convert CommonJS to browser-compatible
console.log('\n🔧 Processing Phase 4 graph modules (Two-Tier v2.2)...');

// Helper function to strip CommonJS require/exports from a module
function stripCommonJS(code, className) {
  // Remove require statements (including try/catch wrapped requires)
  code = code.replace(/const\s+\w+\s*=\s*require\([^)]+\);\s*\n?/g, '');
  code = code.replace(/let\s+\w+\s*;\s*\ntry\s*\{\s*\n\s*\w+\s*=\s*require\([^)]+\);\s*\n\}\s*catch\s*\([^)]*\)\s*\{[^}]*\}\s*\n?/g, '');
  // Remove module.exports = ClassName;
  code = code.replace(/module\.exports\s*=\s*\w+;\s*\n?/g, '');
  // Remove module.exports = { ... };
  code = code.replace(/module\.exports\s*=\s*\{[^}]*\};\s*\n?/g, '');
  // Remove if (typeof module ...) module.exports blocks
  code = code.replace(/if\s*\(typeof\s+module\s*!==\s*'undefined'\s*&&\s*module\.exports\)\s*\{\s*\n?\s*module\.exports\s*=\s*\w+;\s*\n?\s*\}\s*\n?/g, '');
  // Remove if (typeof window ...) window.X blocks
  code = code.replace(/if\s*\(typeof\s+window\s*!==\s*'undefined'\)\s*\{\s*\n?\s*window\.\w+\s*=\s*\w+;\s*\n?\s*\}\s*\n?/g, '');
  // Remove 'use strict' if it appears standalone
  code = code.replace(/'use strict';\s*\n?/g, '');
  return code;
}

// Strip Node.js-only code that survives stripCommonJS() — ensures zero require/fs in bundle
// NOTE: This runs AFTER stripCommonJS(), so require('fs')/require('path') lines are already gone.
// The fs.readFileSync/path.join/__dirname calls survive because they're in function bodies.
function stripBundleNodeCode(code, moduleName) {
  // Normalize CRLF → LF so regexes using \n work on Windows-authored source files
  code = code.replace(/\r\n/g, '\n');
  const before = code.length;

  if (moduleName === 'SemanticGraphBuilder') {
    // --- Lazy module resolvers (25 instances) ---
    // Pattern: (typeof X !== 'undefined') ? X : (() => { try { return require('./X'); } catch (e) { return null; } })()
    // All modules are already in bundle scope — require fallback is dead code
    code = code.replace(
      /\(typeof (\w+) !== 'undefined'\) \? \1 : \(\(\) => \{\s*\n\s*try \{ return require\([^)]+\); \} catch \(e\) \{ return null; \}\s*\n\s*\}\)\(\)/g,
      '(typeof $1 !== "undefined") ? $1 : null'
    );

    // --- Input validator require (Stage 0) ---
    code = code.replace(
      /let _inputValidator;\s*\n\s*try \{ _inputValidator = require\('\.\.\/security\/input-validator'\); \} catch\(e\) \{ \/\* browser \*\/ \}/,
      'const _inputValidator = (typeof validateInput !== "undefined") ? { validateInput: validateInput } : null;'
    );

    // --- Stage 3: POS model Node.js auto-loading (post-stripCommonJS) ---
    // After stripCommonJS, the require('fs')/require('path') lines are gone but fs.readFileSync survives
    code = code.replace(
      /\} else if \(posModelPath\) \{[\s\S]*?this\._treePosTagger = tagger;\s*\n\s*\} else \{[\s\S]*?this\._treePosTagger = tagger;\s*\n\s*\}/,
      `} else {\n        throw new Error('Models not loaded. Call TagTeam.loadModels(posJSON, depJSON) before buildGraph().');\n      }`
    );

    // --- Stage 4: Dep model Node.js auto-loading (post-stripCommonJS) ---
    code = code.replace(
      /\} else if \(buildOptions\.depModel\) \{[\s\S]*?this\._treeDepParser = depParser;\s*\n\s*\} else \{[\s\S]*?this\._treeDepParser = depParser;\s*\n\s*\}/,
      `} else {\n        throw new Error('Models not loaded. Call TagTeam.loadModels(posJSON, depJSON) before buildGraph().');\n      }`
    );

    // --- Stage 4.5: Calibration auto-load (post-stripCommonJS) ---
    code = code.replace(
      /\/\/ Stage 4\.5: Calibration table loading \(lazy-load, cached\)\s*\n\s*if \(!this\._calibration && typeof require !== 'undefined'\) \{[\s\S]*?\/\/ Calibration loading is non-blocking\s*\n\s*\}\s*\n\s*\}/,
      '// Stage 4.5: Calibration — injected via loadModels() / _injectCachedModels()'
    );

    // --- Stage 4.7: Gazetteer auto-load (post-stripCommonJS) ---
    code = code.replace(
      /if \(!this\._treeGazetteerNER && _GazetteerNER\) \{\s*\n\s*if \(typeof require !== 'undefined'\) \{[\s\S]*?\/\/ Gazetteer loading is non-blocking[^\n]*\n\s*\}\s*\n\s*\}\s*\n\s*\}/,
      '// Stage 4.7: Gazetteers — injected via loadModels() / _injectCachedModels()'
    );
  }

  if (moduleName === 'EntityExtractor') {
    // Remove module-level POS model auto-load (post-stripCommonJS: require lines gone, fs/path usage survives)
    code = code.replace(
      /\/\/ Load perceptron model once at module level[^\n]*\nlet _perceptronTagger = null;\nlet _usePerceptron = true;[^\n]*\ntry \{[\s\S]*?_perceptronTagger = null;\s*\n\}/,
      '// Perceptron tagger — injected via loadModels() in bundle\nlet _perceptronTagger = null;\nlet _usePerceptron = true;'
    );
  }

  if (moduleName === 'OutputSanitizer') {
    // Replace process.env.TAGTEAM_VERSION with a browser-safe literal
    code = code.replace(
      /process\.env\.TAGTEAM_VERSION \|\| 'unknown'/g,
      "'3.0.0'"
    );
  }

  const stripped = before - code.length;
  if (stripped > 0) {
    console.log(`  ✓ Stripped ${stripped} bytes of Node.js code from ${moduleName}`);
  }
  return code;
}

// Clean the final assembled bundle — strips patterns that individual module processing missed
function cleanFinalBundle(bundleStr) {
  const before = bundleStr.length;

  // Strip module.exports conditional blocks (empty shells left after stripCommonJS + populated ones)
  // Handles: if (typeof module !== 'undefined' && module.exports) { ... }
  // Uses [\s\S]*? to match multi-line block contents including nested braces
  // Preserves the UMD wrapper at lines 53-55 (uses different pattern: typeof module === 'object')
  bundleStr = bundleStr.replace(
    /if\s*\(typeof\s+module\s*!==\s*'undefined'\s*&&\s*module\.exports\)\s*\{[\s\S]*?\n\s*\}\s*\n?/g,
    ''
  );

  // NOTE: Do NOT strip "if (typeof window !== 'undefined') { window.X = X; }" blocks here.
  // These set up global references (e.g., window.POSTagger) that other bundle code depends on.
  // stripCommonJS() already handles this for modules it processes; the remaining ones are needed.

  // Strip DomainConfigLoader.loadConfig filesystem calls
  // Replace the fs-based loadConfig with a browser-safe version
  bundleStr = bundleStr.replace(
    /loadConfig\(configPath\)\s*\{[\s\S]*?return this\.loadConfigObject\(config\);\s*\n\s*\}/,
    `loadConfig(configPath) {\n    throw new Error('DomainConfigLoader.loadConfig() requires Node.js. Use loadConfigObject(jsonObj) in the browser bundle.');\n  }`
  );

  const stripped = before - bundleStr.length;
  if (stripped > 0) {
    console.log(`  ✓ Final bundle cleanup: stripped ${stripped} bytes of Node.js patterns`);
  }
  return bundleStr;
}

lemmatizerSrc = stripCommonJS(lemmatizerSrc, 'Lemmatizer');
console.log('  ✓ Converted Lemmatizer to browser format');

tokenizer = stripCommonJS(tokenizer, 'Tokenizer');
console.log('  ✓ Converted Tokenizer to browser format');

npChunker = stripCommonJS(npChunker, 'NPChunker');
console.log('  ✓ Converted NPChunker to browser format');

realWorldEntityFactory = stripCommonJS(realWorldEntityFactory, 'RealWorldEntityFactory');
console.log('  ✓ Converted RealWorldEntityFactory to browser format');

entityExtractor = stripCommonJS(entityExtractor, 'EntityExtractor');
entityExtractor = stripBundleNodeCode(entityExtractor, 'EntityExtractor');
console.log('  ✓ Converted EntityExtractor to browser format');

actExtractor = stripCommonJS(actExtractor, 'ActExtractor');
console.log('  ✓ Converted ActExtractor to browser format');

roleDetector = stripCommonJS(roleDetector, 'RoleDetector');
console.log('  ✓ Converted RoleDetector to browser format');

semanticGraphBuilder = stripCommonJS(semanticGraphBuilder, 'SemanticGraphBuilder');
semanticGraphBuilder = stripBundleNodeCode(semanticGraphBuilder, 'SemanticGraphBuilder');
console.log('  ✓ Converted SemanticGraphBuilder to browser format');

jsonldSerializer = stripCommonJS(jsonldSerializer, 'JSONLDSerializer');
console.log('  ✓ Converted JSONLDSerializer to browser format');

// v2.3 factories
scarcityAssertionFactory = stripCommonJS(scarcityAssertionFactory, 'ScarcityAssertionFactory');
console.log('  ✓ Converted ScarcityAssertionFactory to browser format');

directiveExtractor = stripCommonJS(directiveExtractor, 'DirectiveExtractor');
console.log('  ✓ Converted DirectiveExtractor to browser format');

objectAggregateFactory = stripCommonJS(objectAggregateFactory, 'ObjectAggregateFactory');
console.log('  ✓ Converted ObjectAggregateFactory to browser format');

qualityFactory = stripCommonJS(qualityFactory, 'QualityFactory');
console.log('  ✓ Converted QualityFactory to browser format');

// Week 2 modules
assertionEventBuilder = stripCommonJS(assertionEventBuilder, 'AssertionEventBuilder');
console.log('  ✓ Converted AssertionEventBuilder to browser format');

contextManager = stripCommonJS(contextManager, 'ContextManager');
console.log('  ✓ Converted ContextManager to browser format');

informationStaircaseBuilder = stripCommonJS(informationStaircaseBuilder, 'InformationStaircaseBuilder');
console.log('  ✓ Converted InformationStaircaseBuilder to browser format');

// Week 3 modules
shmlValidator = stripCommonJS(shmlValidator, 'SHMLValidator');
console.log('  ✓ Converted SHMLValidator to browser format');

complexityBudget = stripCommonJS(complexityBudget, 'ComplexityBudget');
console.log('  ✓ Converted ComplexityBudget to browser format');

// Phase 2: Domain config loader
domainConfigLoader = stripCommonJS(domainConfigLoader, 'DomainConfigLoader');
console.log('  ✓ Converted DomainConfigLoader to browser format');

// Phase 5: Ambiguity detection
ambiguityReport = stripCommonJS(ambiguityReport, 'AmbiguityReport');
console.log('  ✓ Converted AmbiguityReport to browser format');

ambiguityDetector = stripCommonJS(ambiguityDetector, 'AmbiguityDetector');
console.log('  ✓ Converted AmbiguityDetector to browser format');

// Phase 6: Interpretation Lattice
selectionalPreferences = stripCommonJS(selectionalPreferences, 'SelectionalPreferences');
console.log('  ✓ Converted SelectionalPreferences to browser format');

ambiguityResolver = stripCommonJS(ambiguityResolver, 'AmbiguityResolver');
console.log('  ✓ Converted AmbiguityResolver to browser format');

interpretationLattice = stripCommonJS(interpretationLattice, 'InterpretationLattice');
console.log('  ✓ Converted InterpretationLattice to browser format');

alternativeGraphBuilder = stripCommonJS(alternativeGraphBuilder, 'AlternativeGraphBuilder');
console.log('  ✓ Converted AlternativeGraphBuilder to browser format');

// Phase 6.5: Ontology loading
turtleParser = stripCommonJS(turtleParser, 'TurtleParser');
console.log('  ✓ Converted TurtleParser to browser format');

ontologyManager = stripCommonJS(ontologyManager, 'OntologyManager');
console.log('  ✓ Converted OntologyManager to browser format');

valueNetAdapter = stripCommonJS(valueNetAdapter, 'ValueNetAdapter');
console.log('  ✓ Converted ValueNetAdapter to browser format');

bridgeOntologyLoader = stripCommonJS(bridgeOntologyLoader, 'BridgeOntologyLoader');
console.log('  ✓ Converted BridgeOntologyLoader to browser format');

// Phase 6.6: General-purpose tagger
propertyMapper = stripCommonJS(propertyMapper, 'PropertyMapper');
console.log('  ✓ Converted PropertyMapper to browser format');

ontologyTextTagger = stripCommonJS(ontologyTextTagger, 'OntologyTextTagger');
console.log('  ✓ Converted OntologyTextTagger to browser format');

clauseSegmenter = stripCommonJS(clauseSegmenter, 'ClauseSegmenter');
console.log('  ✓ Converted ClauseSegmenter to browser format');

dependencyParser = stripCommonJS(dependencyParser, 'DependencyParser');
console.log('  ✓ Converted DependencyParser to browser format');

depTree = stripCommonJS(depTree, 'DepTree');
console.log('  ✓ Converted DepTree to browser format');

binaryModelLoader = stripCommonJS(binaryModelLoader, 'BinaryModelLoader');
console.log('  ✓ Converted BinaryModelLoader to browser format');

depTreeCorrector = stripCommonJS(depTreeCorrector, 'DepTreeCorrector');
console.log('  ✓ Converted DepTreeCorrector to browser format');

genericityDetector = stripCommonJS(genericityDetector, 'GenericityDetector');
console.log('  ✓ Converted GenericityDetector to browser format');

unicodeNormalizer = stripCommonJS(unicodeNormalizer, 'UnicodeNormalizer');
console.log('  ✓ Converted UnicodeNormalizer to browser format');

roleMappingContract = stripCommonJS(roleMappingContract, 'RoleMappingContract');
console.log('  ✓ Converted RoleMappingContract to browser format');

perceptronTagger2 = stripCommonJS(perceptronTagger2, 'PerceptronTagger');
console.log('  ✓ Converted PerceptronTagger to browser format');

gazetteerNER = stripCommonJS(gazetteerNER, 'GazetteerNER');
console.log('  ✓ Converted GazetteerNER to browser format');

treeEntityExtractor = stripCommonJS(treeEntityExtractor, 'TreeEntityExtractor');
console.log('  ✓ Converted TreeEntityExtractor to browser format');

treeActExtractor = stripCommonJS(treeActExtractor, 'TreeActExtractor');
console.log('  ✓ Converted TreeActExtractor to browser format');

treeRoleMapper = stripCommonJS(treeRoleMapper, 'TreeRoleMapper');
console.log('  ✓ Converted TreeRoleMapper to browser format');

confidenceAnnotator = stripCommonJS(confidenceAnnotator, 'ConfidenceAnnotator');
console.log('  ✓ Converted ConfidenceAnnotator to browser format');

// ---- Conditional bundle sections (values/ethical layer) ----
// When --core, these are empty strings so the bundle omits the values layer entirely.
// Each section is a self-contained block of the final bundle source.

const _sect_contextAnalyzer = CORE_ONLY ? '' : `
  // ============================================================================
  // CONTEXT ANALYZER (Week 2a) (~15KB)
  // ============================================================================

  const ContextAnalyzer = (function(PatternMatcher) {
${contextAnalyzer}
    return ContextAnalyzer;
  })(PatternMatcher);
`;

const _sect_certainty = CORE_ONLY ? '' : `
  // ============================================================================
  // CERTAINTY ANALYZER (Phase 7.2) (~8KB)
  // ============================================================================

${certaintyAnalyzer}

  // Make CertaintyAnalyzer available globally for SemanticGraphBuilder
  _global.CertaintyAnalyzer = CertaintyAnalyzer;
`;

const _sect_sourceAttribution = CORE_ONLY ? '' : `
  // ============================================================================
  // PHASE 7.1: SOURCE ATTRIBUTION DETECTION (~10KB)
  // ============================================================================

${sourceAttributionDetector}

  // Make SourceAttributionDetector available globally for SemanticGraphBuilder
  _global.SourceAttributionDetector = SourceAttributionDetector;
`;

const _sect_valueData = CORE_ONLY ? '' : `
  // ============================================================================
  // WEEK 2B: ETHICAL VALUE DETECTION DATA (~70KB)
  // ============================================================================

  // Value definitions (50 values across 5 domains)
  _global.VALUE_DEFINITIONS = ${valueDefinitions};

  // Frame and role boost mappings
  _global.FRAME_VALUE_BOOSTS = ${frameValueBoosts};

  // Predefined conflict pairs (18 known ethical tensions)
  _global.CONFLICT_PAIRS = ${conflictPairs};
`;

const _sect_valueMatcher = CORE_ONLY ? '' : `
  // ============================================================================
  // VALUE MATCHER (Week 2b) (~6KB)
  // ============================================================================

  const ValueMatcher = (function(PatternMatcher) {
${valueMatcher}
    return ValueMatcher;
  })(PatternMatcher);

  // Make ValueMatcher available globally for SemanticRoleExtractor
  _global.ValueMatcher = ValueMatcher;
`;

const _sect_valueScorer = CORE_ONLY ? '' : `
  // ============================================================================
  // VALUE SCORER (Week 2b) (~9KB)
  // ============================================================================

  const ValueScorer = (function() {
${valueScorer}
    return ValueScorer;
  })();

  // Make ValueScorer available globally for SemanticRoleExtractor
  _global.ValueScorer = ValueScorer;
`;

const _sect_ethicalProfiler = CORE_ONLY ? '' : `
  // ============================================================================
  // ETHICAL PROFILER (Week 2b) (~12KB)
  // ============================================================================

  const EthicalProfiler = (function() {
${ethicalProfiler}
    return EthicalProfiler;
  })();

  // Make EthicalProfiler available globally for SemanticRoleExtractor
  _global.EthicalProfiler = EthicalProfiler;
`;

const _sect_assertionEventBuilder = CORE_ONLY ? '' : `
  // ============================================================================
  // ASSERTION EVENT BUILDER (Phase 4 - Week 2)
  // Creates ValueAssertionEvent and ContextAssessmentEvent nodes
  // ============================================================================

${assertionEventBuilder}
`;

const _sect_valueNetAdapter = CORE_ONLY ? '' : `
${valueNetAdapter}
`;

const _sect_bridgeOntologyLoader = CORE_ONLY ? '' : `
${bridgeOntologyLoader}
`;

// Build the bundle
console.log('\n🔧 Building bundle...');
if (CORE_ONLY) console.log('  ℹ Core-only mode: values/ethical layer excluded');

const bundle = `/*!
 * TagTeam.js - Two-Tier Semantic Graph Architecture for Ethical Context Analysis
 * Version: 7.0 (v2 Phase 2: Dependency Parser)
 * Date: ${new Date().toISOString().split('T')[0]}
 *
 * A client-side JavaScript library for extracting semantic roles from natural language text
 *
 * Phase 6: Interpretation Lattice
 *   - AmbiguityDetector: Detects modal, scope, noun category, selectional ambiguities
 *   - SelectionalPreferences: 8 verb classes, 6 entity categories
 *   - AmbiguityResolver: Hierarchy of evidence for resolution decisions
 *   - InterpretationLattice: Default reading + alternative interpretations
 *   - AlternativeGraphBuilder: Modal strength scale, metonymic bridge
 *   - options.preserveAmbiguity enables lattice generation
 *
 * Phase 6.5: Ontology Loading (NEW)
 *   - TurtleParser: Lightweight TTL/Turtle parser for ValueNet ontologies
 *   - OntologyManager: Unified JSON + TTL loading with caching
 *   - ValueNetAdapter: ValueNet → ValueMatcher format conversion
 *   - BridgeOntologyLoader: IEE bridge ontology (owl:sameAs, worldview mapping)
 *
 * Phase 6.6: General-Purpose Ontology Text Tagger
 *   - PropertyMapper: Configurable property-to-TagDefinition mapping
 *   - OntologyTextTagger: Load any TTL, map properties, tag text
 *
 * Phase 4-5: Two-Tier JSON-LD semantic graph with BFO/CCO ontology support
 *   - Tier 1 (ICE): DiscourseReferent - parsing layer
 *   - Tier 2 (IC): Person/Artifact - real-world entities
 *   - ActualityStatus on all acts (Prescribed, Actual, Negated, etc.)
 *   - Cross-tier linking via cco:is_about
 *   - Ambiguity detection and flagging
 *
 * Earlier Phases:
 *   - Week 1: Semantic role extraction
 *   - Week 2a: Context intensity analysis (12 dimensions)
 *   - Week 2b: Ethical value detection (50 values, conflict detection)
 *   - Week 3: Enhanced pattern matching with NLP
 *   - SHACL validation and complexity budget
 *
 * Inspired by d3.js and mermaid.js - single file, simple API
 * Dependency: Compromise.js (~345KB) for lemmatization and NLP features
 *
 * Copyright (c) 2025-2026 Aaron Damiano
 * Licensed under MIT
 *
 * Repository: https://github.com/Skreen5hot/TagTeam.js
 */

(function(global, factory) {
  'use strict';

  // UMD (Universal Module Definition) for compatibility
  if (typeof module === 'object' && typeof module.exports === 'object') {
    // Node.js / CommonJS
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    // AMD (RequireJS)
    define([], factory);
  } else {
    // Browser global
    global.TagTeam = factory();
  }
})(typeof window !== 'undefined' ? window : this, function() {
  'use strict';

  // Setup global reference (works in both browser and Node.js)
  const _global = typeof window !== 'undefined' ? window : global;

  // ============================================================================
  // LEXICON DATA (~4.2MB)
  // ============================================================================

${lexicon}

  // Define LEXICON_TAG_MAP (required by POSTagger)
  _global.LEXICON_TAG_MAP = {
    "NN": ["NN"], "NNS": ["NNS"], "NNP": ["NNP"],
    "JJ": ["JJ"], "JJR": ["JJR"], "JJS": ["JJS"],
    "VB": ["VB"], "VBD": ["VBD"], "VBG": ["VBG"], "VBN": ["VBN"], "VBP": ["VBP"], "VBZ": ["VBZ"],
    "RB": ["RB"], "RBR": ["RBR"], "RBS": ["RBS"],
    "PRP": ["PRP"], "PRP$": ["PRP$"], "DT": ["DT"], "IN": ["IN"], "CC": ["CC"], "UH": ["UH"],
    "CD": ["CD"], "EX": ["EX"], "FW": ["FW"], "LS": ["LS"], "MD": ["MD"], "POS": ["POS"],
    "SYM": ["SYM"], "TO": ["TO"], "WDT": ["WDT"], "WP": ["WP"], "WP$": ["WP$"], "WRB": ["WRB"]
  };

  // ============================================================================
  // POS TAGGER (~4KB)
  // ============================================================================

${posTagger}

  // ============================================================================
  // COMPROMISE.JS - NLP LIBRARY (Week 3) (~345KB)
  // Shadow module/exports so compromise UMD takes the browser path (sets _global.nlp)
  // instead of the Node.js path which would hijack our bundle export.
  // eslint-disable-next-line no-var
  var module, exports;
  // ============================================================================

${compromise}

  // Make nlp available to PatternMatcher (compromise is inlined above)
  const nlp = typeof _global.nlp !== 'undefined' ? _global.nlp : null;
  if (!nlp) {
    throw new Error('TagTeam: compromise NLP engine not found. Ensure compromise is loaded before TagTeam.');
  }

  // ============================================================================
  // MATCHING STRATEGIES (Week 3) (~2KB)
  // ============================================================================

  const MatchingStrategies = (function() {
${matchingStrategies}
    return MatchingStrategies;
  })();

  // ============================================================================
  // PATTERN MATCHER (Week 2a + Week 3 Enhancement) (~12KB)
  // ============================================================================

  const PatternMatcher = (function(nlp) {
${patternMatcher}
    return PatternMatcher;
  })(nlp);

${_sect_contextAnalyzer}
${_sect_certainty}
${_sect_sourceAttribution}

  // ============================================================================
  // PHASE 7 v7: SENTENCE MODE CLASSIFIER (~6KB)
  // ============================================================================

${sentenceModeClassifier}

  // Make SentenceModeClassifier available globally for ActExtractor
  _global.SentenceModeClassifier = SentenceModeClassifier;

  // ============================================================================
  // PHASE 7 v7: COMPLEX DESIGNATOR DETECTOR (~12KB)
  // ============================================================================

${complexDesignatorDetector}

  // Make ComplexDesignatorDetector available globally for SemanticGraphBuilder
  _global.ComplexDesignatorDetector = ComplexDesignatorDetector;

  // ============================================================================
  // PHASE 9.3: COMBINED VALIDATION REPORT (~12KB)
  // ============================================================================

${combinedValidationReport}

  // Make CombinedValidationReport available globally for SemanticGraphBuilder
  _global.CombinedValidationReport = CombinedValidationReport;

  // ============================================================================
  // SECURITY MODULES (~15KB)
  // ============================================================================

${inputValidator}

${semanticValidators}

${outputSanitizer}

${auditLogger}

${_sect_valueData}
${_sect_valueMatcher}
${_sect_valueScorer}
${_sect_ethicalProfiler}

  // ============================================================================
  // SEMANTIC ROLE EXTRACTOR (~32KB + Week 2a/2b enhancements)
  // ============================================================================

${semanticExtractor}

  // ============================================================================
  // PHASE 4: TWO-TIER JSON-LD SEMANTIC GRAPH MODULES (v2.2)
  // ============================================================================

  // Browser-compatible SHA-256 implementation for IRI generation
  const crypto = {
    createHash: function(algorithm) {
      if (algorithm !== 'sha256') {
        throw new Error('Only sha256 is supported in browser');
      }
      return {
        _data: '',
        update: function(data) {
          this._data += data;
          return this;
        },
        digest: function(encoding) {
          // Simple deterministic hash for browser
          // Uses djb2 algorithm - fast and produces good distribution
          let hash = 5381;
          const str = this._data;
          for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
            hash = hash & 0xffffffff; // Convert to 32bit unsigned
          }
          // Convert to hex and create 64-char string for consistency with SHA-256
          const hex1 = (hash >>> 0).toString(16).padStart(8, '0');
          // Create second hash for more entropy
          let hash2 = 0;
          for (let i = 0; i < str.length; i++) {
            hash2 = str.charCodeAt(i) + ((hash2 << 6) + (hash2 << 16) - hash2);
            hash2 = hash2 & 0xffffffff;
          }
          const hex2 = (hash2 >>> 0).toString(16).padStart(8, '0');
          return (hex1 + hex2).repeat(4).substring(0, 64);
        }
      };
    }
  };

  // ============================================================================
  // LEMMATIZER (Core NLP - Morphological reduction)
  // Reduces inflected words to base/dictionary form (e.g., dogs → dog)
  // ============================================================================

${lemmatizerSrc}

  // ============================================================================
  // REAL WORLD ENTITY FACTORY (Phase 4 - Two-Tier v2.2)
  // Creates Tier 2 entities (cco:Person, cco:Artifact) from Tier 1 referents
  // ============================================================================

${realWorldEntityFactory}

  // ============================================================================
  // TOKENIZER (Phase 4 - Entity Extraction dependency)
  // Character-level tokenizer for NP chunking
  // ============================================================================

${tokenizer}

  // ============================================================================
  // NP CHUNKER (Phase 4 - Entity Extraction dependency)
  // Noun phrase chunking from POS-tagged tokens
  // ============================================================================

${npChunker}

  // ============================================================================
  // ENTITY EXTRACTOR (Phase 4 - Two-Tier v2.2)
  // Creates Tier 1 DiscourseReferents and Tier 2 entities
  // ============================================================================

${entityExtractor}

  // ============================================================================
  // ACT EXTRACTOR (Phase 4 - Week 1)
  // ============================================================================

${actExtractor}

  // ============================================================================
  // ROLE DETECTOR (Phase 4 - Week 1)
  // ============================================================================

${roleDetector}

  // ============================================================================
  // JSON-LD SERIALIZER (Phase 4 - Week 1)
  // ============================================================================

${jsonldSerializer}

  // ============================================================================
  // SCARCITY ASSERTION FACTORY (Phase 4 - v2.3)
  // Creates ScarcityAssertion ICE nodes for scarcity information
  // ============================================================================

${scarcityAssertionFactory}

  // ============================================================================
  // DIRECTIVE EXTRACTOR (Phase 4 - v2.3)
  // Extracts DirectiveContent ICE for modal markers (must, should, may)
  // ============================================================================

${directiveExtractor}

  // ============================================================================
  // OBJECT AGGREGATE FACTORY (Phase 4 - v2.3)
  // Creates ObjectAggregate for plural entities with individual members
  // ============================================================================

${objectAggregateFactory}

  // ============================================================================
  // QUALITY FACTORY (Phase 4 - v2.4)
  // Creates BFO Quality nodes for entity qualifiers
  // ============================================================================

${qualityFactory}

${_sect_assertionEventBuilder}

  // ============================================================================
  // CONTEXT MANAGER (Phase 4 - Week 2)
  // Manages InterpretationContext nodes for GIT-Minimal compliance
  // ============================================================================

${contextManager}

  // ============================================================================
  // INFORMATION STAIRCASE BUILDER (Phase 4 - Week 2)
  // Creates IBE node and parser agent for provenance
  // ============================================================================

${informationStaircaseBuilder}

  // ============================================================================
  // SHML VALIDATOR (Phase 4 - Week 3)
  // Validates graphs against SHACL patterns for BFO/CCO compliance
  // ============================================================================

${shmlValidator}

  // ============================================================================
  // COMPLEXITY BUDGET (Phase 4 - Week 3)
  // Enforces complexity limits on graph construction
  // ============================================================================

${complexityBudget}

  // ============================================================================
  // DOMAIN CONFIG LOADER (Phase 2 - Domain-Neutral Implementation)
  // Loads domain-specific type mappings for BFO → CCO specialization
  // ============================================================================

${domainConfigLoader}

  // ============================================================================
  // PHASE 5: AMBIGUITY REPORT
  // Data structure for ambiguity detection results
  // ============================================================================

${ambiguityReport}

  // ============================================================================
  // PHASE 5: AMBIGUITY DETECTOR
  // Detects modal, scope, noun category, and selectional ambiguities
  // ============================================================================

${ambiguityDetector}

  // ============================================================================
  // PHASE 6: SELECTIONAL PREFERENCES
  // Defines verb classes and entity categories for selectional constraints
  // ============================================================================

${selectionalPreferences}

  // ============================================================================
  // PHASE 6: AMBIGUITY RESOLVER
  // Decides which ambiguities to preserve vs resolve based on evidence hierarchy
  // ============================================================================

${ambiguityResolver}

  // ============================================================================
  // PHASE 6: INTERPRETATION LATTICE
  // Data structure for multi-reading ambiguity preservation
  // ============================================================================

${interpretationLattice}

  // ============================================================================
  // PHASE 6: ALTERNATIVE GRAPH BUILDER
  // Generates alternative graph nodes for modal/scope/metonymy
  // ============================================================================

${alternativeGraphBuilder}

  // ============================================================================
  // PHASE 6.5: ONTOLOGY LOADING MODULES
  // TTL parsing, unified loading, ValueNet adapter, bridge ontology
  // ============================================================================

${turtleParser}

${ontologyManager}

${_sect_valueNetAdapter}
${_sect_bridgeOntologyLoader}

  // ============================================================================
  // PHASE 6.6: GENERAL-PURPOSE ONTOLOGY TEXT TAGGER
  // ============================================================================

${propertyMapper}

${ontologyTextTagger}

  // ============================================================================
  // v2 CLAUSE SEGMENTER (Phase 1)
  // ============================================================================

${clauseSegmenter}

  // ============================================================================
  // v2 DEPENDENCY PARSER (Phase 2)
  // ============================================================================

${dependencyParser}

${depTree}

${binaryModelLoader}

  // ============================================================================
  // v2 PHASE 4: DITRANSITIVE ARC CORRECTOR
  // ============================================================================

${depTreeCorrector}

  // Shim: after stripCommonJS, only the inner functions survive.
  // SemanticGraphBuilder checks typeof DepTreeCorrector !== 'undefined'.
  const DepTreeCorrector = { correctDitransitives, DITRANSITIVE_VERBS, RECIPIENT_NOUNS };

  // ============================================================================
  // §9.5: GENERICITY DETECTOR
  // ============================================================================

${genericityDetector}

  // ============================================================================
  // v2 PHASE 0: CORE CONTRACTS (for tree pipeline browser support)
  // ============================================================================

${unicodeNormalizer}

  // Shim: after stripCommonJS, only function normalizeUnicode survives.
  // SemanticGraphBuilder checks typeof UnicodeNormalizer !== 'undefined'.
  const UnicodeNormalizer = { normalizeUnicode };

${roleMappingContract}

  // Shim: after stripCommonJS, only inner constants/functions survive.
  // TreeRoleMapper references RoleMappingContract.mapUDToRole() etc.
  const RoleMappingContract = { UD_TO_BFO_ROLE, CASE_TO_OBLIQUE_ROLE, mapUDToRole, mapCaseToOblique };

  // ============================================================================
  // v2 PHASE 1: PERCEPTRON TAGGER (for tree pipeline browser support)
  // ============================================================================

${perceptronTagger2}

  // ============================================================================
  // v2 PHASE 3A: TREE-BASED EXTRACTORS
  // ============================================================================

${gazetteerNER}

${treeEntityExtractor}

${treeActExtractor}

${treeRoleMapper}

  // ============================================================================
  // v2 PHASE 3B: CONFIDENCE ANNOTATOR
  // ============================================================================

${confidenceAnnotator}

  // ============================================================================
  // SEMANTIC GRAPH BUILDER (Phase 4 - Week 1 + Week 2 + Phase 6)
  // ============================================================================

${semanticGraphBuilder}

  // ============================================================================
  // EMBEDDED MODELS (baked in at build time — zero-configuration parsing)
  // ============================================================================

  const _EMBEDDED_POS_MODEL = ${embeddedPosModel};
  const _EMBEDDED_DEP_MODEL = ${embeddedDepModel};
  const _EMBEDDED_CALIBRATION = ${embeddedCalibration};
  const _EMBEDDED_GAZETTEERS = [
    ${embeddedGazNames},
    ${embeddedGazOrgs},
    ${embeddedGazPlaces}
  ];

  // ============================================================================
  // UNIFIED API
  // ============================================================================

  // Model cache — initialized from embedded data, overridable via loadModels()
  let _cachedPosModel = _EMBEDDED_POS_MODEL;
  let _cachedDepModel = _EMBEDDED_DEP_MODEL;
  let _cachedCalibration = _EMBEDDED_CALIBRATION;
  let _cachedGazetteers = _EMBEDDED_GAZETTEERS;
  let _buildTreeGraphWarned = false;

  // Shared helper: inject cached models into a SemanticGraphBuilder instance
  function _injectCachedModels(builder) {
    if (_cachedPosModel) {
      builder._treePosTagger = new PerceptronTagger(_cachedPosModel);
    }
    if (_cachedDepModel) {
      builder._treeDepParser = new DependencyParser(_cachedDepModel);
    }
    if (_cachedCalibration) {
      builder._calibration = _cachedCalibration;
    }
    if (_cachedGazetteers && typeof GazetteerNER !== 'undefined') {
      builder._treeGazetteerNER = new GazetteerNER(_cachedGazetteers);
    }
  }

  // ── Ontology enrichment (private) ──────────────────────────────
  // Annotates Tier 2 entity nodes with ontology class matches.
  // Called by buildGraph() when options.ontology is provided.
  // Identification: nodes with is_subject_of are Tier 2 entities.
  // Matching: token-level overlap (not substring) between entity
  // labels and tag evidence terms. Checks both the Tier 2 label
  // (normalized/lemmatized) and the linked Tier 1 referent label
  // (original text) to handle lemmatization mismatches.
  function _enrichGraphWithOntology(graph, tags, threshold) {
    var nodes = graph['@graph'] || [];
    // Build @id → node lookup for Tier 1 referent label resolution
    var nodeIndex = {};
    for (var ni = 0; ni < nodes.length; ni++) {
      if (nodes[ni]['@id']) nodeIndex[nodes[ni]['@id']] = nodes[ni];
    }
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      // Positive identification: is_subject_of marks Tier 2 entities
      if (!node['is_subject_of']) continue;
      var t2Label = (node['rdfs:label'] || '').toLowerCase();
      if (!t2Label) continue;
      // Also get the Tier 1 referent's label (original text, pre-lemmatization)
      var t1Label = '';
      var t1Ref = node['is_subject_of'];
      if (t1Ref && t1Ref['@id'] && nodeIndex[t1Ref['@id']]) {
        t1Label = (nodeIndex[t1Ref['@id']]['rdfs:label'] || '').toLowerCase();
      }
      var t2Tokens = t2Label.split(/\\s+/);
      var t1Tokens = t1Label ? t1Label.split(/\\s+/) : [];
      for (var ti = 0; ti < tags.length; ti++) {
        var tag = tags[ti];
        if (tag.confidence < threshold) continue;
        var ev = tag.evidence || [];
        for (var ei = 0; ei < ev.length; ei++) {
          var evLower = ev[ei].toLowerCase();
          // Token-level match: try Tier 2 label first, then Tier 1 label
          var matched = _tokenMatch(evLower, t2Tokens) || _tokenMatch(evLower, t1Tokens);
          if (!matched) continue;
          // Annotate — don't mutate @type
          if (!node['ontologyMatch']) node['ontologyMatch'] = [];
          node['ontologyMatch'].push({
            ontologyMatchClass: tag.iri || tag['class'],
            ontologyMatchConfidence: tag.confidence,
            ontologyMatchEvidence: ev[ei],
            ontologyMatchLabel: tag.label || ''
          });
          // Update classNominationStatus if this is an unresolved owl:Class node
          if (node['tagteam:classNominationStatus'] === 'unresolved') {
            node['tagteam:classNominationStatus'] = 'resolved';
            node['tagteam:requiresOntologyResolution'] = false;
          }
          break; // One evidence match per tag is sufficient
        }
      }
    }
  }

  // Token-level match helper: handles single-word and multi-word evidence
  function _tokenMatch(evLower, labelTokens) {
    if (!labelTokens.length) return false;
    var evTokens = evLower.split(/\\s+/);
    if (evTokens.length === 1) {
      for (var i = 0; i < labelTokens.length; i++) {
        if (labelTokens[i] === evLower) return true;
      }
      return false;
    }
    // Multi-token: all evidence tokens must appear in label tokens
    for (var i = 0; i < evTokens.length; i++) {
      if (labelTokens.indexOf(evTokens[i]) === -1) return false;
    }
    return true;
  }

  /**
   * TagTeam - Unified API for semantic parsing
   */
  const TagTeam = {
    /**
     * Parse a sentence and extract semantic roles
     *
     * @param {string} text - The sentence to parse
     * @param {Object} options - Optional configuration
     * @param {boolean} options.includeConfidence - Include confidence scores (default: true)
     * @param {boolean} options.detectNegation - Detect negation (default: true)
     * @param {boolean} options.resolveCompounds - Handle multi-word entities (default: true)
     * @param {boolean} options.includeRawTokens - Include raw POS tokens (default: false)
     * @returns {Object} Semantic action structure
     *
     * @example
     * const result = TagTeam.parse("I should tell my doctor about the pain");
     * console.log(result.agent);  // { text: "I", entity: "self" }
     * console.log(result.action); // { verb: "tell", modality: "should" }
     */
    parse: function(text, options) {
      options = options || {};

      const extractor = new SemanticRoleExtractor();
      const result = extractor.parseSemanticAction(text);

      // Apply options
      if (options.includeRawTokens) {
        result._rawTokens = extractor.lastTokens;
      }

      return result;
    },

    /**
     * Parse multiple sentences in batch
     *
     * @param {string[]} texts - Array of sentences to parse
     * @returns {Object[]} Array of semantic action structures
     *
     * @example
     * const results = TagTeam.parseMany([
     *   "I love my best friend",
     *   "The doctor recommended treatment"
     * ]);
     */
    parseMany: function(texts) {
      return texts.map(text => this.parse(text));
    },

${CORE_ONLY ? '' : `    /**
     * Load value definitions for semantic matching (Week 2 feature)
     *
     * @param {Object} definitions - Value definitions in IEE format
     */
    loadValueDefinitions: function(definitions) {
      // TODO: Implement in Week 2
      console.warn('TagTeam.loadValueDefinitions: Feature available in Week 2');
      return this;
    },
`}
    /**
     * Add custom compound terms
     *
     * @param {string[]} terms - Array of multi-word terms
     *
     * @example
     * TagTeam.loadCompoundTerms(["artificial intelligence", "machine learning"]);
     */
    loadCompoundTerms: function(terms) {
      if (typeof SemanticRoleExtractor.prototype.addCompoundTerms === 'function') {
        const extractor = new SemanticRoleExtractor();
        extractor.addCompoundTerms(terms);
      }
      return this;
    },

    /**
     * Add custom semantic frame
     *
     * @param {Object} frameDefinition - Frame definition
     *
     * @example
     * TagTeam.addSemanticFrame({
     *   name: 'spiritual_practice',
     *   coreVerbs: ['pray', 'worship', 'meditate']
     * });
     */
${CORE_ONLY ? '' : `    addSemanticFrame: function(frameDefinition) {
      // TODO: Implement frame extension API
      console.warn('TagTeam.addSemanticFrame: Feature available in Week 2');
      return this;
    },
`}
    /**
     * Build a JSON-LD semantic graph from natural language text (Phase 4)
     *
     * @param {string} text - The text to analyze
     * @param {Object} [options] - Optional configuration
     * @param {string} [options.context] - Interpretation context (e.g., 'MedicalEthics')
     * @param {boolean} [options.useLegacy] - Use legacy Compromise pipeline (default: false)
     * @param {Object} [options.ontology] - An OntologyTextTagger instance; Tier 2
     *   entities will be annotated with matched ontology class metadata
     * @param {number} [options.ontologyThreshold=0.2] - Minimum confidence for
     *   ontology matches (0.0-1.0)
     * @param {boolean} [options.extractEntities] - Extract entities (default: true)
     * @param {boolean} [options.extractActs] - Extract acts (default: true)
     * @param {boolean} [options.detectRoles] - Detect roles (default: true)
     * @returns {Object} Graph object with @graph array
     *
     * @example
     * const graph = TagTeam.buildGraph("The doctor must allocate the ventilator");
     *
     * @example
     * // With ontology enrichment
     * const tagger = TagTeam.OntologyTextTagger.fromTTL(ttlString);
     * const graph = TagTeam.buildGraph("The patient has fever", { ontology: tagger });
     * // Tier 2 entity nodes now have ontologyMatch annotations
     */
    buildGraph: function(text, options) {
      options = options || {};
      var graph;

      // Legacy escape hatch
      if (options.useLegacy) {
        const builder = new SemanticGraphBuilder(options);
        graph = builder.build(text, options);
      } else {
        // Tree pipeline (default)
        const builder = new SemanticGraphBuilder(options);
        _injectCachedModels(builder);
        graph = builder.build(text, Object.assign({}, options, { useTreeExtractors: true }));
      }

      // Ontology enrichment: annotate Tier 2 entities with matched ontology classes
      if (options.ontology && typeof options.ontology.tagText === 'function') {
        var tags = options.ontology.tagText(text);
        if (tags && tags.length > 0) {
          var threshold = typeof options.ontologyThreshold === 'number'
            ? options.ontologyThreshold : 0.2;
          _enrichGraphWithOntology(graph, tags, threshold);
        }
      }

      return graph;
    },

    /**
     * Build and serialize a JSON-LD semantic graph (Phase 4)
     *
     * @param {string} text - The text to analyze
     * @param {Object} options - Optional configuration
     * @param {boolean} options.pretty - Pretty-print JSON (default: false)
     * @returns {string} JSON-LD string
     *
     * @example
     * const jsonld = TagTeam.toJSONLD("The doctor must allocate the ventilator");
     * console.log(jsonld); // Valid JSON-LD string
     */
    toJSONLD: function(text, options) {
      options = options || {};
      const graph = this.buildGraph(text, options);
      const serializer = new JSONLDSerializer({ pretty: options.pretty });
      return serializer.serialize(graph);
    },

    /**
     * Override the built-in models with custom weights.
     * The bundle ships with models baked in — this is only needed
     * to swap in domain-specific weights or custom gazetteers.
     * Replaces (not merges) the active model cache.
     *
     * @param {Object} posJSON - POS tagger weights (replaces built-in)
     * @param {Object} depJSON - Dependency parser weights (replaces built-in)
     * @param {Object} [calibrationJSON] - Calibration table (replaces built-in)
     * @param {Object} [gazetteersJSON] - Gazetteer data (replaces built-in)
     */
    loadModels: function(posJSON, depJSON, calibrationJSON, gazetteersJSON) {
      _cachedPosModel = posJSON;
      _cachedDepModel = depJSON;
      if (calibrationJSON) _cachedCalibration = calibrationJSON;
      if (gazetteersJSON) _cachedGazetteers = gazetteersJSON;
    },

    /**
     * Backward-compatible alias for loadModels().
     * @deprecated Use loadModels() instead.
     */
    loadTreeModels: function(posJSON, depJSON, calibrationJSON, gazetteersJSON) {
      return this.loadModels(posJSON, depJSON, calibrationJSON, gazetteersJSON);
    },

    /**
     * Check whether pipeline models have been loaded.
     * @returns {boolean} true if POS and dependency models are cached
     */
    areModelsLoaded: function() {
      return !!_cachedPosModel && !!_cachedDepModel;
    },

    /**
     * Build a JSON-LD semantic graph using tree-based extractors.
     * @deprecated Use buildGraph() instead — it now uses the tree pipeline by default.
     *
     * @param {string} text - The text to analyze
     * @param {Object} [options] - Optional configuration
     * @returns {Object} Graph object with @graph array and _metadata
     */
    buildTreeGraph: function(text, options) {
      if (!_buildTreeGraphWarned) {
        console.warn('buildTreeGraph() is deprecated. Use buildGraph() instead. buildGraph() now uses the tree pipeline by default.');
        _buildTreeGraphWarned = true;
      }
      options = options || {};
      const builder = new SemanticGraphBuilder(options);
      _injectCachedModels(builder);
      return builder.build(text, Object.assign({}, options, { useTreeExtractors: true }));
    },

    /**
     * Version information
     */
    version: '${pkgVersion}',
    BUILD: '${buildInfo}',

    // Advanced: Expose classes for power users
    SemanticRoleExtractor: SemanticRoleExtractor,
    POSTagger: POSTagger,

    // Phase 4: Two-Tier Graph building classes (v2.3)
    SemanticGraphBuilder: SemanticGraphBuilder,
    JSONLDSerializer: JSONLDSerializer,
    RealWorldEntityFactory: RealWorldEntityFactory,
    EntityExtractor: EntityExtractor,
    ActExtractor: ActExtractor,
    RoleDetector: RoleDetector,

    // v2.3: New factories for BFO/CCO compliance
    ScarcityAssertionFactory: ScarcityAssertionFactory,
    DirectiveExtractor: DirectiveExtractor,
    ObjectAggregateFactory: ObjectAggregateFactory,

    // v2.4: Quality factory
    QualityFactory: QualityFactory,

    // Week 2: Assertion events and GIT-Minimal
${CORE_ONLY ? '' : '    AssertionEventBuilder: AssertionEventBuilder,'}
    ContextManager: ContextManager,
    InformationStaircaseBuilder: InformationStaircaseBuilder,

    // Week 3: SHACL validation and complexity budget
    SHMLValidator: SHMLValidator,
    ComplexityBudget: ComplexityBudget,

    // Phase 2: Domain configuration
    DomainConfigLoader: DomainConfigLoader,

    // Phase 5: Ambiguity detection
    AmbiguityReport: AmbiguityReport,
    AmbiguityDetector: AmbiguityDetector,

    // Phase 6: Interpretation Lattice
    SelectionalPreferences: SelectionalPreferences,
    AmbiguityResolver: AmbiguityResolver,
    InterpretationLattice: InterpretationLattice,
    AlternativeGraphBuilder: AlternativeGraphBuilder,

    // Phase 6.5: Ontology loading
    TurtleParser: TurtleParser,
    OntologyManager: OntologyManager,
${CORE_ONLY ? '' : `    ValueNetAdapter: ValueNetAdapter,
    BridgeOntologyLoader: BridgeOntologyLoader,`}

    // Phase 6.6: General-purpose tagger
    PropertyMapper: PropertyMapper,
    OntologyTextTagger: OntologyTextTagger,

${CORE_ONLY ? '' : `    // Phase 7.2: Certainty analysis
    CertaintyAnalyzer: CertaintyAnalyzer,

    // Phase 7.1: Source attribution detection
    SourceAttributionDetector: SourceAttributionDetector,
`}
    // Phase 7 v7: Sentence mode classifier + complex designator detector
    SentenceModeClassifier: SentenceModeClassifier,
    ComplexDesignatorDetector: ComplexDesignatorDetector,

    // Phase 9.3: Combined validation report
    CombinedValidationReport: CombinedValidationReport,

    // v2 Phase 1: Clause segmenter
    ClauseSegmenter: ClauseSegmenter,

    // v2 Phase 2: Dependency parser
    DependencyParser: DependencyParser,
    DepTree: DepTree,
    BinaryModelLoader: BinaryModelLoader,

    // v2 Phase 4: Ditransitive arc corrector
    DepTreeCorrector: DepTreeCorrector,

    // §9.5: Genericity detector
    GenericityDetector: GenericityDetector,

    // v2 Phase 3A: Tree-based extractors
    TreeEntityExtractor: TreeEntityExtractor,
    TreeActExtractor: TreeActExtractor,
    TreeRoleMapper: TreeRoleMapper,

    // v2 Phase 3B: Confidence annotator
    ConfidenceAnnotator: ConfidenceAnnotator,

    // Security modules
    validateInput: validateInput,
    INPUT_LIMITS: INPUT_LIMITS,
    SemanticSecurityValidator: SemanticSecurityValidator,
    sanitize: sanitize,
    sanitizeWithProvenance: sanitizeWithProvenance,
    SecurityAuditLogger: SecurityAuditLogger
  };

  // Return the unified API
  return TagTeam;
});
`;

// Final bundle cleanup — strip Node.js patterns that survived module-level processing
console.log('\n🧹 Final bundle cleanup...');
let cleanedBundle = cleanFinalBundle(bundle);

// Write the bundle
const outputPath = path.join(distDir, OUTPUT_NAME);
fs.writeFileSync(outputPath, cleanedBundle, 'utf8');

const bundleSize = fs.statSync(outputPath).size;
console.log(`  ✓ Generated dist/${OUTPUT_NAME} (${(bundleSize / 1024 / 1024).toFixed(2)} MB)`);

// ============================================================================
// BUNDLE INTEGRITY GATE — Edge-canonical single-file enforcement
// Fail the build if any Node.js-only patterns survive into the bundle.
// ============================================================================
console.log('\n🔒 Running bundle integrity gate...');
const bundleContent = fs.readFileSync(outputPath, 'utf8');

// Split bundle into TagTeam code vs. compromise (third-party, minified on one line)
// Compromise is inlined as a single minified line starting with !function(e,t){
const bundleLines = bundleContent.split('\n');
const compromiseLine = bundleLines.findIndex(l => l.startsWith('!function(e,t){"object"==typeof exports'));
const tagteamCode = bundleLines.filter((_, i) => i !== compromiseLine).join('\n');

// Strict-zero forbidden patterns — checked against TagTeam code only (excludes compromise internals)
const forbidden = [
  { pattern: 'require(',      label: 'require() calls' },
  { pattern: 'readFileSync',  label: 'fs.readFileSync' },
  { pattern: 'existsSync',    label: 'fs.existsSync' },
  { pattern: '__dirname',     label: '__dirname references' },
  { pattern: 'process.env',   label: 'process.env references' },
  { pattern: 'process.cwd',   label: 'process.cwd references' },
];

// module.exports: UMD wrapper uses 2 known-safe occurrences (typeof module === 'object')
const KNOWN_MODULE_EXPORTS = 2;

let gateFailures = 0;
for (const { pattern, label } of forbidden) {
  const count = tagteamCode.split(pattern).length - 1;
  if (count > 0) {
    console.error(`  ✗ Bundle contains ${count} instance(s) of "${pattern}" (${label})`);
    gateFailures++;
  } else {
    console.log(`  ✓ Zero ${label}`);
  }
}

// module.exports check with UMD wrapper exception
const meCount = tagteamCode.split('module.exports').length - 1;
if (meCount > KNOWN_MODULE_EXPORTS) {
  console.error(`  ✗ Bundle contains ${meCount} instance(s) of "module.exports" (expected ≤${KNOWN_MODULE_EXPORTS}: UMD wrapper only)`);
  gateFailures++;
} else {
  console.log(`  ✓ module.exports: ${meCount} (all known-safe: UMD wrapper)`);
}

if (compromiseLine >= 0) {
  console.log(`  ℹ Compromise.js (line ${compromiseLine + 1}): third-party minified — excluded from gate`);
}

if (gateFailures > 0) {
  console.error(`\n❌ Bundle integrity gate FAILED (${gateFailures} violation(s)). Fix before shipping.`);
  process.exit(1);
}
console.log('  ✓ Bundle integrity gate PASSED — zero Node.js patterns in TagTeam code');

// Create a simple test HTML
const testHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TagTeam.js Bundle Test</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 900px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
    }
    h1 { color: #2563eb; }
    h2 { color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    pre {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 12px;
      max-height: 400px;
    }
    .result {
      margin: 20px 0;
      padding: 15px;
      border: 2px solid #10b981;
      border-radius: 8px;
      background: #f0fdf4;
    }
    .result-phase4 {
      border-color: #8b5cf6;
      background: #f5f3ff;
    }
    button {
      background: #2563eb;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      margin-right: 10px;
    }
    button:hover { background: #1d4ed8; }
    button.phase4 { background: #7c3aed; }
    button.phase4:hover { background: #6d28d9; }
    .section { margin-bottom: 40px; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      margin-left: 8px;
    }
    .badge-new { background: #dcfce7; color: #166534; }
    .badge-legacy { background: #e5e7eb; color: #374151; }
    .summary-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 15px;
      margin: 10px 0;
    }
    .summary-box h4 { margin: 0 0 10px 0; color: #1e40af; }
    .summary-item { margin: 5px 0; }
    textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      resize: vertical;
    }
  </style>
</head>
<body>
  <h1>🎯 TagTeam.js v3.0.0-alpha.2</h1>
  <p>Semantic Parser with JSON-LD Graph Output</p>

  <div class="section">
    <h2>Phase 4: JSON-LD Semantic Graph <span class="badge badge-new">NEW</span></h2>
    <p>Build BFO/CCO-compliant knowledge graphs from natural language</p>

    <label for="phase4-input"><strong>Input Text:</strong></label>
    <textarea id="phase4-input" rows="2">The doctor must allocate the last ventilator between two critically ill patients</textarea>
    <br><br>
    <button class="phase4" onclick="testPhase4()">Build JSON-LD Graph</button>
    <button class="phase4" onclick="testPhase4Summary()">Show Summary</button>
    <div id="phase4-result"></div>
  </div>

  <hr>

  <div class="section">
    <h2>Legacy API <span class="badge badge-legacy">CLASSIC</span></h2>
    <p>Original semantic role extraction</p>

    <h3>Test 1: Simple Parse</h3>
    <button onclick="test1()">Run Test 1</button>
    <div id="test1-result"></div>

    <h3>Test 2: Batch Parse</h3>
    <button onclick="test2()">Run Test 2</button>
    <div id="test2-result"></div>

    <h3>Test 3: IEE Test Sentence</h3>
    <button onclick="test3()">Run Test 3</button>
    <div id="test3-result"></div>
  </div>

  <!-- Load the bundle -->
  <script src="tagteam.js"></script>

  <script>
    // Phase 4: JSON-LD Graph Demo
    function testPhase4() {
      const text = document.getElementById('phase4-input').value;
      const jsonld = TagTeam.toJSONLD(text, { pretty: true });

      document.getElementById('phase4-result').innerHTML = \`
        <div class="result result-phase4">
          <strong>JSON-LD Output:</strong>
          <pre>\${jsonld}</pre>
        </div>
      \`;
    }

    function testPhase4Summary() {
      const text = document.getElementById('phase4-input').value;
      const graph = TagTeam.buildGraph(text);

      const referents = graph['@graph'].filter(n =>
        n['@type'] && n['@type'].includes('tagteam:DiscourseReferent'));
      const acts = graph['@graph'].filter(n =>
        n['@type'] && n['@type'].some(t => t.includes('IntentionalAct') || t.includes('ActOf')));
      const roles = graph['@graph'].filter(n =>
        n['@type'] && n['@type'].includes('bfo:BFO_0000023'));

      let summaryHtml = \`
        <div class="result result-phase4">
          <div class="summary-box">
            <h4>📊 Graph Summary</h4>
            <div class="summary-item"><strong>Total Nodes:</strong> \${graph['@graph'].length}</div>
            <div class="summary-item"><strong>Discourse Referents:</strong> \${referents.length}</div>
            <div class="summary-item"><strong>Intentional Acts:</strong> \${acts.length}</div>
            <div class="summary-item"><strong>BFO Roles:</strong> \${roles.length}</div>
          </div>
      \`;

      if (referents.length > 0) {
        summaryHtml += \`<h4>👤 Discourse Referents (Entities)</h4><ul>\`;
        referents.forEach(r => {
          summaryHtml += \`<li><strong>\${r['rdfs:label']}</strong> → \${r['tagteam:denotesType']}\`;
          if (r['tagteam:is_scarce']) summaryHtml += \` ⚠️ SCARCE\`;
          summaryHtml += \`</li>\`;
        });
        summaryHtml += \`</ul>\`;
      }

      if (acts.length > 0) {
        summaryHtml += \`<h4>⚡ Intentional Acts</h4><ul>\`;
        acts.forEach(a => {
          const actType = a['@type'].find(t => t.includes('cco:')) || 'IntentionalAct';
          summaryHtml += \`<li><strong>\${a['tagteam:verb']}</strong> (\${actType})\`;
          if (a['tagteam:modality']) summaryHtml += \` [modality: \${a['tagteam:modality']}]\`;
          summaryHtml += \`</li>\`;
        });
        summaryHtml += \`</ul>\`;
      }

      if (roles.length > 0) {
        summaryHtml += \`<h4>🎭 BFO Roles</h4><ul>\`;
        roles.forEach(r => {
          summaryHtml += \`<li>\${r['rdfs:label']}</li>\`;
        });
        summaryHtml += \`</ul>\`;
      }

      summaryHtml += \`</div>\`;
      document.getElementById('phase4-result').innerHTML = summaryHtml;
    }

    // Legacy tests
    function test1() {
      const text = "I love my best friend";
      const result = TagTeam.parse(text);

      document.getElementById('test1-result').innerHTML = \`
        <div class="result">
          <strong>Input:</strong> "\${text}"<br><br>
          <strong>Result:</strong>
          <pre>\${JSON.stringify(result, null, 2)}</pre>
        </div>
      \`;
    }

    function test2() {
      const texts = [
        "I love my best friend",
        "The doctor recommended treatment",
        "We must decide about the coal plant"
      ];
      const results = TagTeam.parseMany(texts);

      document.getElementById('test2-result').innerHTML = \`
        <div class="result">
          <strong>Input:</strong> 3 sentences<br><br>
          <strong>Results:</strong>
          <pre>\${JSON.stringify(results, null, 2)}</pre>
        </div>
      \`;
    }

    function test3() {
      const text = "I should tell my doctor about the pain";
      const result = TagTeam.parse(text);

      document.getElementById('test3-result').innerHTML = \`
        <div class="result">
          <strong>Input:</strong> "\${text}"<br><br>
          <strong>Agent:</strong> \${result.agent ? result.agent.text : 'N/A'}<br>
          <strong>Action:</strong> \${result.action ? result.action.verb : 'N/A'}<br>
          <strong>Modality:</strong> \${result.action && result.action.modality ? result.action.modality : 'none'}<br>
          <strong>Recipient:</strong> \${result.recipient ? result.recipient.text : 'N/A'}<br>
          <strong>Theme:</strong> \${result.theme ? result.theme.text : 'N/A'}<br>
          <strong>Frame:</strong> \${result.semanticFrame || 'N/A'}<br><br>
          <strong>Full Result:</strong>
          <pre>\${JSON.stringify(result, null, 2)}</pre>
        </div>
      \`;
    }

    // Auto-run Phase 4 demo on load
    window.addEventListener('load', () => {
      console.log('TagTeam.js loaded! Version:', TagTeam.version);
      testPhase4Summary();
    });
  </script>
</body>
</html>
`;

if (!CORE_ONLY) {
  fs.writeFileSync(path.join(distDir, 'test.html'), testHtml, 'utf8');
  console.log('  ✓ Created dist/test.html');
}

// Models are now embedded in the bundle — no separate files needed

// Summary
console.log(`\n✨ Build complete! (${CORE_ONLY ? 'core' : 'full'})\n`);
console.log(`📦 Bundle: dist/${OUTPUT_NAME}`);
if (!CORE_ONLY) console.log('🧪 Test:   dist/test.html');
console.log(`\n📖 Usage:`);
console.log(`   <script src="${OUTPUT_NAME}"></script>`);
console.log('   <script>');
console.log('     const graph = TagTeam.buildGraph("The agent arrested the suspect");');
console.log('     console.log(graph);');
console.log('   </script>\n');
