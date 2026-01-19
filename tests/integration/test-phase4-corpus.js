/**
 * test-phase4-corpus.js
 *
 * Phase 4 IEE Corpus Validation
 * Tests all scenarios through Phase 4 pipeline and validates with SHACL
 *
 * @version 4.0.0-phase4-week3
 */

const fs = require('fs');
const path = require('path');

// Simulate browser environment
global.window = global;

// Load POSTagger - first load lexicon
const lexiconScript = fs.readFileSync(path.join(__dirname, '../../src/core/lexicon.js'), 'utf8');
eval(lexiconScript);
global.POSTAGGER_LEXICON = window.POSTAGGER_LEXICON;

// Define LEXICON_TAG_MAP (required by POSTagger)
global.LEXICON_TAG_MAP = {
  "NN": ["NN"], "NNS": ["NNS"], "NNP": ["NNP"],
  "JJ": ["JJ"], "JJR": ["JJR"], "JJS": ["JJS"],
  "VB": ["VB"], "VBD": ["VBD"], "VBG": ["VBG"], "VBN": ["VBN"], "VBP": ["VBP"], "VBZ": ["VBZ"],
  "RB": ["RB"], "RBR": ["RBR"], "RBS": ["RBS"],
  "PRP": ["PRP"], "PRP$": ["PRP$"], "DT": ["DT"], "IN": ["IN"], "CC": ["CC"], "UH": ["UH"],
  "CD": ["CD"], "EX": ["EX"], "FW": ["FW"], "LS": ["LS"], "MD": ["MD"], "POS": ["POS"],
  "SYM": ["SYM"], "TO": ["TO"], "WDT": ["WDT"], "WP": ["WP"], "WP$": ["WP$"], "WRB": ["WRB"]
};

// Load POSTagger script (defines POSTagger globally)
const posTagScript = fs.readFileSync(path.join(__dirname, '../../src/core/POSTagger.js'), 'utf8');
eval(posTagScript);
global.POSTagger = POSTagger;
global.window.POSTagger = POSTagger;

const PatternMatcher = require(path.join(__dirname, '../../src/core/PatternMatcher.js'));
global.PatternMatcher = PatternMatcher;

const ContextAnalyzer = require(path.join(__dirname, '../../src/analyzers/ContextAnalyzer.js'));
global.ContextAnalyzer = ContextAnalyzer;

// Load data files
const valueDefinitions = JSON.parse(fs.readFileSync(path.join(__dirname, '../../iee-collaboration/from-iee/data/value-definitions-comprehensive.json'), 'utf8'));
const frameValueBoosts = JSON.parse(fs.readFileSync(path.join(__dirname, '../../iee-collaboration/from-iee/data/frame-value-boosts.json'), 'utf8'));
const conflictPairs = JSON.parse(fs.readFileSync(path.join(__dirname, '../../iee-collaboration/from-iee/data/conflict-pairs.json'), 'utf8'));
const compoundTerms = JSON.parse(fs.readFileSync(path.join(__dirname, '../../iee-collaboration/from-iee/data/compound-terms.json'), 'utf8'));

global.VALUE_DEFINITIONS = valueDefinitions;
global.FRAME_VALUE_BOOSTS = frameValueBoosts;
global.CONFLICT_PAIRS = conflictPairs;
global.COMPOUND_TERMS = compoundTerms;

// Load Week 2b components
const ValueMatcher = require(path.join(__dirname, '../../src/analyzers/ValueMatcher.js'));
const ValueScorer = require(path.join(__dirname, '../../src/analyzers/ValueScorer.js'));
const EthicalProfiler = require(path.join(__dirname, '../../src/analyzers/EthicalProfiler.js'));

global.ValueMatcher = ValueMatcher;
global.ValueScorer = ValueScorer;
global.EthicalProfiler = EthicalProfiler;

// Load Phase 4 components
const SemanticGraphBuilder = require(path.join(__dirname, '../../src/graph/SemanticGraphBuilder.js'));
const JSONLDSerializer = require(path.join(__dirname, '../../src/graph/JSONLDSerializer.js'));
const SHMLValidator = require(path.join(__dirname, '../../src/graph/SHMLValidator.js'));
const ComplexityBudget = require(path.join(__dirname, '../../src/graph/ComplexityBudget.js'));

// Load SemanticRoleExtractor AFTER globals are set
require(path.join(__dirname, '../../src/core/SemanticRoleExtractor.js'));
const SemanticRoleExtractor = global.SemanticRoleExtractor;

// Load test corpus (Week 2 has 20 scenarios)
const testCorpusWeek2 = JSON.parse(fs.readFileSync(path.join(__dirname, '../../iee-collaboration/from-iee/data/test-corpus-week2.json'), 'utf8'));

// Try to load Week 1 corpus for additional scenarios
let testCorpusWeek1 = null;
try {
  testCorpusWeek1 = JSON.parse(fs.readFileSync(path.join(__dirname, '../../iee-collaboration/from-iee/data/test-corpus-week1.json'), 'utf8'));
} catch (e) {
  console.log('Note: Week 1 corpus not found, using Week 2 only');
}

// Combine scenarios
const allScenarios = [...testCorpusWeek2.scenarios];
if (testCorpusWeek1 && testCorpusWeek1.scenarios) {
  // Add Week 1 scenarios that aren't duplicated in Week 2
  testCorpusWeek1.scenarios.forEach(w1 => {
    if (!allScenarios.find(w2 => w2.id === w1.id)) {
      // Convert Week 1 format to Week 2 format
      allScenarios.push({
        id: w1.id,
        domain: w1.domain,
        complexity: 'moderate',
        title: w1.title,
        scenario: w1.description,
        testSentence: w1.description.split('.')[0] + '.',
        expectedOutput: {
          values: w1.expectedValues ? w1.expectedValues.map(v => ({
            name: v.value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            present: v.expectedRelevance,
            salience: v.expectedSalience === 'high' ? 0.9 : v.expectedSalience === 'medium' ? 0.6 : 0.3,
            polarity: 0,
            evidence: v.reasoning
          })) : []
        }
      });
    }
  });
}

console.log('========================================');
console.log('Phase 4 IEE Corpus Validation');
console.log('========================================\n');

console.log(`Total scenarios: ${allScenarios.length}`);
console.log(`Week 2 scenarios: ${testCorpusWeek2.scenarios.length}`);
if (testCorpusWeek1) {
  console.log(`Week 1 additional: ${testCorpusWeek1.scenarios.length}`);
}
console.log('');

// Initialize extractor (for getting values and context intensity)
const extractor = new SemanticRoleExtractor();

// Initialize Phase 4 components
const graphBuilder = new SemanticGraphBuilder();
const serializer = new JSONLDSerializer();
const validator = new SHMLValidator();

// Track results
const results = {
  total: 0,
  validJSON: 0,
  validJSONLD: 0,
  shaclCompliant: 0,
  shaclViolations: 0,
  shaclWarnings: 0,
  totalViolations: 0,
  totalWarnings: 0,
  avgComplianceScore: 0,
  avgNodeCount: 0,
  avgParseTime: 0,
  scenarios: [],
  violationsByPattern: {},
  warningsByPattern: {}
};

// Domain mapping for context
const domainToContext = {
  'healthcare': 'MedicalEthics',
  'spiritual': 'VirtueEthics',
  'vocational': 'DeontologicalEthics',
  'interpersonal': 'CareEthics',
  'environmental': 'UtilitarianEthics'
};

console.log('Processing scenarios...\n');

// Run all scenarios
allScenarios.forEach((scenario, idx) => {
  const scenarioNum = idx + 1;
  results.total++;

  const scenarioResult = {
    id: scenario.id,
    domain: scenario.domain,
    title: scenario.title || scenario.id,
    text: scenario.testSentence || scenario.scenario,
    validJSON: false,
    validJSONLD: false,
    shaclCompliant: false,
    complianceScore: 0,
    violations: [],
    warnings: [],
    nodeCount: 0,
    parseTime: 0,
    error: null
  };

  try {
    // Get appropriate context
    const context = domainToContext[scenario.domain] || 'Default';

    // Time the parse
    const startTime = Date.now();

    // First, extract values and context using existing pipeline
    const parseResult = extractor.parseSemanticAction(scenarioResult.text);

    // Get scored values and context intensity from the parse result
    let scoredValues = [];
    let contextIntensity = null;

    if (parseResult.ethicalProfile && parseResult.ethicalProfile.values) {
      scoredValues = parseResult.ethicalProfile.values.map(v => ({
        name: v.name,
        score: v.salience || 0.5,
        polarity: v.polarity || 0,
        confidence: 0.85,
        evidence: v.evidence || scenarioResult.text
      }));
    }

    if (parseResult.contextIntensity) {
      contextIntensity = parseResult.contextIntensity;
    }

    // Build graph with values and context
    const graphResult = graphBuilder.build(scenarioResult.text, {
      context: context,
      extractValues: true,
      extractContext: true,
      scoredValues: scoredValues,
      contextIntensity: contextIntensity
    });

    // Serialize to JSON-LD (adds @context)
    const jsonldStr = serializer.serialize(graphResult);
    const graph = JSON.parse(jsonldStr);

    const endTime = Date.now();
    scenarioResult.parseTime = endTime - startTime;

    // Check valid JSON
    scenarioResult.validJSON = true;
    results.validJSON++;

    // Check valid JSON-LD structure
    if (graph && graph['@context'] && graph['@graph']) {
      scenarioResult.validJSONLD = true;
      results.validJSONLD++;
      scenarioResult.nodeCount = graph['@graph'].length;
    }

    // Run SHACL validation
    const report = validator.validate(graph);
    scenarioResult.complianceScore = report.complianceScore;
    scenarioResult.violations = report.violations.map(v => ({
      pattern: v.pattern,
      message: v.message,
      node: v.node
    }));
    scenarioResult.warnings = report.warnings.map(w => ({
      pattern: w.pattern,
      message: w.message,
      node: w.node
    }));

    // Track compliance
    if (report.violations.length === 0) {
      scenarioResult.shaclCompliant = true;
      results.shaclCompliant++;
    } else {
      results.shaclViolations++;
    }

    if (report.warnings.length > 0) {
      results.shaclWarnings++;
    }

    // Aggregate counts
    results.totalViolations += report.violations.length;
    results.totalWarnings += report.warnings.length;
    results.avgComplianceScore += report.complianceScore;
    results.avgNodeCount += scenarioResult.nodeCount;
    results.avgParseTime += scenarioResult.parseTime;

    // Track violations by pattern
    report.violations.forEach(v => {
      results.violationsByPattern[v.pattern] = (results.violationsByPattern[v.pattern] || 0) + 1;
    });
    report.warnings.forEach(w => {
      results.warningsByPattern[w.pattern] = (results.warningsByPattern[w.pattern] || 0) + 1;
    });

    // Log progress
    const status = scenarioResult.shaclCompliant ? '✅' : '⚠️';
    console.log(`  [${scenarioNum}/${allScenarios.length}] ${status} ${scenario.id} (${scenarioResult.complianceScore}%, ${scenarioResult.nodeCount} nodes, ${scenarioResult.parseTime}ms)`);

    if (report.violations.length > 0) {
      report.violations.slice(0, 2).forEach(v => {
        console.log(`        ❌ ${v.pattern}: ${v.message.substring(0, 60)}...`);
      });
    }

  } catch (error) {
    scenarioResult.error = error.message;
    console.log(`  [${scenarioNum}/${allScenarios.length}] ❌ ${scenario.id}: ERROR - ${error.message}`);
  }

  results.scenarios.push(scenarioResult);
});

// Calculate averages
results.avgComplianceScore = results.total > 0 ? Math.round(results.avgComplianceScore / results.total) : 0;
results.avgNodeCount = results.total > 0 ? Math.round(results.avgNodeCount / results.total) : 0;
results.avgParseTime = results.total > 0 ? Math.round(results.avgParseTime / results.total) : 0;

// Calculate compliance rate
const complianceRate = results.total > 0 ? Math.round((results.shaclCompliant / results.total) * 100) : 0;

// Summary
console.log('\n========================================');
console.log('SUMMARY');
console.log('========================================\n');

console.log(`Scenarios Processed: ${results.total}`);
console.log(`Valid JSON: ${results.validJSON}/${results.total} (${Math.round(results.validJSON/results.total*100)}%)`);
console.log(`Valid JSON-LD: ${results.validJSONLD}/${results.total} (${Math.round(results.validJSONLD/results.total*100)}%)`);
console.log('');

console.log('SHACL Compliance:');
console.log(`  Compliant (0 violations): ${results.shaclCompliant}/${results.total} (${complianceRate}%)`);
console.log(`  With violations: ${results.shaclViolations}`);
console.log(`  With warnings: ${results.shaclWarnings}`);
console.log(`  Total violations: ${results.totalViolations}`);
console.log(`  Total warnings: ${results.totalWarnings}`);
console.log('');

console.log('Averages:');
console.log(`  Compliance score: ${results.avgComplianceScore}%`);
console.log(`  Node count: ${results.avgNodeCount}`);
console.log(`  Parse time: ${results.avgParseTime}ms`);
console.log('');

// Violations by pattern
if (Object.keys(results.violationsByPattern).length > 0) {
  console.log('Violations by Pattern:');
  Object.entries(results.violationsByPattern)
    .sort((a, b) => b[1] - a[1])
    .forEach(([pattern, count]) => {
      console.log(`  ${pattern}: ${count}`);
    });
  console.log('');
}

// Warnings by pattern
if (Object.keys(results.warningsByPattern).length > 0) {
  console.log('Warnings by Pattern:');
  Object.entries(results.warningsByPattern)
    .sort((a, b) => b[1] - a[1])
    .forEach(([pattern, count]) => {
      console.log(`  ${pattern}: ${count}`);
    });
  console.log('');
}

// Acceptance Criteria Check
console.log('========================================');
console.log('ACCEPTANCE CRITERIA');
console.log('========================================\n');

const criteria = [
  {
    id: 'AC-W3.1',
    description: 'All scenarios produce valid JSON-LD',
    target: 100,
    actual: Math.round(results.validJSONLD / results.total * 100),
    pass: results.validJSONLD === results.total
  },
  {
    id: 'AC-W3.2',
    description: 'SHACL compliance rate >= 90%',
    target: 90,
    actual: complianceRate,
    pass: complianceRate >= 90
  },
  {
    id: 'AC-W3.3',
    description: 'Average compliance score >= 80%',
    target: 80,
    actual: results.avgComplianceScore,
    pass: results.avgComplianceScore >= 80
  },
  {
    id: 'AC-W3.5',
    description: 'Parse time < 300ms',
    target: 300,
    actual: results.avgParseTime,
    pass: results.avgParseTime < 300
  },
  {
    id: 'AC-W3.6',
    description: 'Average nodes < 200',
    target: 200,
    actual: results.avgNodeCount,
    pass: results.avgNodeCount < 200
  }
];

let allPass = true;
criteria.forEach(c => {
  const status = c.pass ? '✅ PASS' : '❌ FAIL';
  console.log(`${c.id}: ${c.description}`);
  console.log(`       Target: ${c.target}${c.id.includes('time') ? 'ms' : '%'}, Actual: ${c.actual}${c.id.includes('time') ? 'ms' : c.id.includes('nodes') ? '' : '%'} - ${status}`);
  if (!c.pass) allPass = false;
});

console.log('');

// Overall assessment
console.log('========================================');
console.log('OVERALL ASSESSMENT');
console.log('========================================\n');

if (allPass) {
  console.log('🎉 ALL ACCEPTANCE CRITERIA PASSED!');
  console.log('Phase 4 is production-ready.\n');
} else {
  console.log('⚠️ SOME CRITERIA NOT MET');
  console.log('Review violations and warnings above.\n');
}

// Failed scenarios detail
const failedScenarios = results.scenarios.filter(s => !s.shaclCompliant || s.error);
if (failedScenarios.length > 0 && failedScenarios.length <= 10) {
  console.log('========================================');
  console.log('FAILED SCENARIOS DETAIL');
  console.log('========================================\n');

  failedScenarios.forEach(s => {
    console.log(`${s.id} (${s.domain}):`);
    console.log(`  Text: "${s.text.substring(0, 80)}..."`);
    if (s.error) {
      console.log(`  Error: ${s.error}`);
    } else {
      console.log(`  Compliance: ${s.complianceScore}%`);
      s.violations.forEach(v => {
        console.log(`  ❌ [${v.pattern}] ${v.message}`);
      });
    }
    console.log('');
  });
}

// Save detailed report
const report = {
  timestamp: new Date().toISOString(),
  version: '4.0.0-phase4-week3',
  summary: {
    total: results.total,
    validJSON: results.validJSON,
    validJSONLD: results.validJSONLD,
    shaclCompliant: results.shaclCompliant,
    complianceRate: complianceRate + '%',
    avgComplianceScore: results.avgComplianceScore + '%',
    avgNodeCount: results.avgNodeCount,
    avgParseTime: results.avgParseTime + 'ms',
    totalViolations: results.totalViolations,
    totalWarnings: results.totalWarnings
  },
  acceptanceCriteria: criteria,
  violationsByPattern: results.violationsByPattern,
  warningsByPattern: results.warningsByPattern,
  scenarios: results.scenarios,
  allPass: allPass
};

const reportPath = path.join(__dirname, '../../planning/week3/PHASE4_CORPUS_VALIDATION.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`📄 Detailed report saved to: planning/week3/PHASE4_CORPUS_VALIDATION.json\n`);

// Exit with appropriate code
process.exit(allPass ? 0 : 1);
