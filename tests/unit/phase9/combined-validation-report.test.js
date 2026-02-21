/**
 * CombinedValidationReport Tests
 * Phase 9.3: Combined Validation Report
 *
 * Tests unified validation report generation combining:
 * - Internal self-assessment (node coverage, structural richness)
 * - External SHACL validation (compliance score)
 * - Complexity budget health
 * - Ambiguity assessment
 * - Structural completeness
 */

const assert = require('assert');
const CombinedValidationReport = require('../../../src/graph/CombinedValidationReport');

const tests = [];
const results = { passed: 0, failed: 0 };

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Phase 9.3: CombinedValidationReport Tests');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const t of tests) {
    try {
      await t.fn();
      results.passed++;
      console.log(`  ✅ ${t.name}`);
    } catch (e) {
      results.failed++;
      console.log(`  ❌ ${t.name}`);
      console.log(`     ${e.message}`);
    }
  }

  console.log(`\n  Total: ${results.passed} passed, ${results.failed} failed\n`);

  if (results.failed > 0) {
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════
// Helper: Build mock graph
// ═══════════════════════════════════════════════════════════════

function mockGraph(nodeCount, options = {}) {
  const nodes = [];

  // IBE node
  nodes.push({
    '@id': 'inst:IBE_1',
    '@type': ['cco:InformationBearingEntity', 'owl:NamedIndividual'],
    'rdfs:label': 'Input text'
  });

  // Entities
  for (let i = 0; i < (options.entities || 2); i++) {
    nodes.push({
      '@id': `inst:Entity_${i}`,
      '@type': ['tagteam:DiscourseReferent', 'owl:NamedIndividual'],
      'rdfs:label': `entity_${i}`,
      'tagteam:denotesType': options.missingTypes ? undefined : 'cco:Person'
    });
  }

  // Acts
  for (let i = 0; i < (options.acts || 1); i++) {
    nodes.push({
      '@id': `inst:Act_${i}`,
      '@type': ['cco:IntentionalAct', 'owl:NamedIndividual'],
      'rdfs:label': `act_${i}`,
      'cco:has_agent': options.missingAgents ? undefined : { '@id': 'inst:Entity_0' }
    });
  }

  // Roles
  for (let i = 0; i < (options.roles || 1); i++) {
    nodes.push({
      '@id': `inst:Role_${i}`,
      '@type': ['bfo:Role', 'owl:NamedIndividual'],
      'rdfs:label': 'AgentRole'
    });
  }

  // Hedged nodes
  if (options.hedged) {
    nodes[1]['tagteam:isHedged'] = true;
    nodes[1]['tagteam:hedgeMarkers'] = ['might'];
  }

  // Attribution nodes
  if (options.attributions) {
    nodes.push({
      '@id': 'inst:Attr_1',
      '@type': ['tagteam:SourceAttribution', 'owl:NamedIndividual'],
      'tagteam:attributionType': 'direct_quote',
      'tagteam:detectedSource': 'Dr. Smith'
    });
  }

  return {
    '@graph': nodes,
    _metadata: {
      inputLength: options.inputLength || 50,
      nodeCount: nodes.length,
      buildTimestamp: new Date().toISOString()
    }
  };
}

function mockShaclResult(score, violations = 0, warnings = 0) {
  return {
    valid: violations === 0,
    complianceScore: score,
    violations: Array(violations).fill({ severity: 'VIOLATION', message: 'test' }),
    warnings: Array(warnings).fill({ severity: 'WARNING', message: 'test' }),
    patterns: {
      InformationStaircase: { passed: 3, total: 3, score: 100 },
      RolePattern: { passed: 2, total: 3, score: 67 }
    },
    summary: { totalNodes: 10, violationCount: violations, warningCount: warnings }
  };
}

function mockBudgetUsage(nodePercentage, truncated = false, exceeded = false) {
  return {
    nodes: { current: nodePercentage, max: 100, percentage: nodePercentage },
    exceeded,
    truncated,
    warnings: truncated ? ['Truncated'] : []
  };
}

// ═══════════════════════════════════════════════════════════════
// Basic Report Generation
// ═══════════════════════════════════════════════════════════════

test('Generates report with required structure', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({ graph: mockGraph(5) });

  assert.ok(report.validation, 'Should have validation');
  assert.ok(report.validation.internal, 'Should have internal');
  assert.ok(report.validation.external, 'Should have external');
  assert.ok(report.validation.budget, 'Should have budget');
  assert.ok(report.validation.combined, 'Should have combined');
});

test('Report has @type and timestamp', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({ graph: mockGraph(5) });

  assert.strictEqual(report['@type'], 'tagteam:CombinedValidationReport');
  assert.ok(report['tagteam:timestamp'], 'Should have timestamp');
});

test('Combined section has overallScore, grade, recommendation', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({ graph: mockGraph(5) });

  assert.ok(typeof report.validation.combined.overallScore === 'number');
  assert.ok(typeof report.validation.combined.grade === 'string');
  assert.ok(typeof report.validation.combined.recommendation === 'string');
});

// ═══════════════════════════════════════════════════════════════
// Internal Self-Assessment
// ═══════════════════════════════════════════════════════════════

test('Internal assessment counts entities and acts', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({ graph: mockGraph(5, { entities: 3, acts: 2 }) });

  assert.strictEqual(report.validation.internal.entityCount, 3);
  assert.strictEqual(report.validation.internal.actCount, 2);
});

test('Internal score reflects structural richness', () => {
  const reporter = new CombinedValidationReport();

  // Rich graph (entities + acts + roles)
  const rich = reporter.generate({ graph: mockGraph(10, { entities: 3, acts: 2, roles: 2 }) });
  // Empty graph
  const reporter2 = new CombinedValidationReport();
  const empty = reporter2.generate({ graph: { '@graph': [] } });

  assert.ok(rich.validation.internal.selfAssessmentScore > empty.validation.internal.selfAssessmentScore,
    'Rich graph should score higher');
});

test('Coverage ratio computed from input length', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({
    graph: mockGraph(5, { inputLength: 100 }),
    inputText: 'x'.repeat(100)
  });

  assert.ok(report.validation.internal.coverageRatio >= 0);
  assert.ok(report.validation.internal.coverageRatio <= 1.0);
});

// ═══════════════════════════════════════════════════════════════
// External SHACL Validation
// ═══════════════════════════════════════════════════════════════

test('External assessment uses SHACL compliance score', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({
    graph: mockGraph(5),
    shaclResult: mockShaclResult(92, 0, 1)
  });

  assert.strictEqual(report.validation.external.compliancePercentage, 92);
  assert.strictEqual(report.validation.external.violationCount, 0);
  assert.strictEqual(report.validation.external.warningCount, 1);
});

test('External shows null when SHACL not run', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({ graph: mockGraph(5) });

  assert.strictEqual(report.validation.external.shaclValidationScore, null);
});

test('SHACL pattern scores included in details', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({
    graph: mockGraph(5),
    shaclResult: mockShaclResult(85, 1, 2)
  });

  assert.ok(report.details.shaclPatterns, 'Should include pattern details');
  assert.ok(report.details.shaclPatterns.InformationStaircase);
});

// ═══════════════════════════════════════════════════════════════
// Complexity Budget
// ═══════════════════════════════════════════════════════════════

test('Budget within bounds scores well', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({
    graph: mockGraph(5),
    budgetUsage: mockBudgetUsage(30)
  });

  assert.strictEqual(report.validation.budget.withinBudget, true);
  assert.strictEqual(report.validation.budget.truncated, false);
  assert.strictEqual(report.validation.budget.usagePercentage, 30);
});

test('Truncated budget flagged in report', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({
    graph: mockGraph(5),
    budgetUsage: mockBudgetUsage(95, true, false)
  });

  assert.strictEqual(report.validation.budget.truncated, true);
});

test('Exceeded budget flagged in report', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({
    graph: mockGraph(5),
    budgetUsage: mockBudgetUsage(100, false, true)
  });

  assert.strictEqual(report.validation.budget.withinBudget, false);
});

// ═══════════════════════════════════════════════════════════════
// Grading System
// ═══════════════════════════════════════════════════════════════

test('High-quality graph gets grade A', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({
    graph: mockGraph(10, { entities: 3, acts: 2, roles: 2 }),
    shaclResult: mockShaclResult(95, 0, 0),
    budgetUsage: mockBudgetUsage(25)
  });

  assert.strictEqual(report.validation.combined.grade, 'A');
});

test('Empty graph gets low grade', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({
    graph: { '@graph': [] },
    shaclResult: mockShaclResult(0, 5, 3)
  });

  const grade = report.validation.combined.grade;
  assert.ok(grade === 'D' || grade === 'F', `Expected D or F, got ${grade}`);
});

test('Grade thresholds are accessible', () => {
  const thresholds = CombinedValidationReport.getThresholds();
  assert.ok(thresholds.EXCELLENT >= 0.9);
  assert.ok(thresholds.GOOD >= 0.75);
  assert.ok(thresholds.ACCEPTABLE >= 0.60);
});

// ═══════════════════════════════════════════════════════════════
// Recommendations
// ═══════════════════════════════════════════════════════════════

test('Excellent graph gets positive recommendation', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({
    graph: mockGraph(10, { entities: 3, acts: 2, roles: 2 }),
    shaclResult: mockShaclResult(95, 0, 0),
    budgetUsage: mockBudgetUsage(20)
  });

  assert.ok(report.validation.combined.recommendation.includes('Ready for downstream'),
    'Should recommend for consumption');
});

test('Low SHACL score triggers recommendation', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({
    graph: mockGraph(5),
    shaclResult: mockShaclResult(50, 3, 2)
  });

  assert.ok(report.validation.combined.recommendation.includes('SHACL') ||
    report.validation.combined.recommendation.includes('compliance') ||
    report.validation.combined.recommendation.includes('ontological'),
    'Should mention SHACL issue');
});

test('Truncated input triggers recommendation', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({
    graph: mockGraph(5),
    budgetUsage: mockBudgetUsage(95, true, false)
  });

  assert.ok(report.validation.combined.recommendation.includes('truncat') ||
    report.validation.combined.recommendation.includes('chunk'),
    'Should mention truncation');
});

// ═══════════════════════════════════════════════════════════════
// Phase 7 Integration
// ═══════════════════════════════════════════════════════════════

test('Phase 7 certainty markers detected in details', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({
    graph: mockGraph(5, { hedged: true })
  });

  assert.ok(report.details.phase7, 'Should have phase7 details');
  assert.ok(report.details.phase7.hasCertainty, 'Should detect certainty');
  assert.strictEqual(report.details.phase7.certainty.hedgedCount, 1);
});

test('Phase 7 attribution detected in details', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({
    graph: mockGraph(5, { attributions: true })
  });

  assert.ok(report.details.phase7, 'Should have phase7 details');
  assert.ok(report.details.phase7.hasAttribution, 'Should detect attribution');
  assert.strictEqual(report.details.phase7.attribution.count, 1);
});

// ═══════════════════════════════════════════════════════════════
// Structural Completeness
// ═══════════════════════════════════════════════════════════════

test('Complete graph has no completeness issues', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({
    graph: mockGraph(5, { entities: 2, acts: 1, roles: 1 })
  });

  const issues = report.details?.completeness || [];
  assert.strictEqual(issues.length, 0, 'Complete graph should have no issues');
});

test('Missing agents flagged as completeness issue', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({
    graph: mockGraph(5, { missingAgents: true })
  });

  assert.ok(report.details.completeness, 'Should have completeness issues');
  const agentIssue = report.details.completeness.find(i => i.type === 'missing_agent');
  assert.ok(agentIssue, 'Should flag missing agents');
});

test('Missing denotesType flagged as completeness issue', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({
    graph: mockGraph(5, { missingTypes: true })
  });

  assert.ok(report.details.completeness, 'Should have completeness issues');
  const typeIssue = report.details.completeness.find(i => i.type === 'missing_denotes_type');
  assert.ok(typeIssue, 'Should flag missing types');
});

// ═══════════════════════════════════════════════════════════════
// Score Breakdown
// ═══════════════════════════════════════════════════════════════

test('Breakdown includes all available dimensions', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({
    graph: mockGraph(5),
    shaclResult: mockShaclResult(90),
    budgetUsage: mockBudgetUsage(40)
  });

  const bd = report.validation.combined.breakdown;
  assert.ok(bd.shaclCompliance !== null, 'Should have SHACL score');
  assert.ok(bd.nodeCoverage !== null, 'Should have coverage score');
  assert.ok(bd.budgetHealth !== null, 'Should have budget score');
  assert.ok(bd.completeness !== null, 'Should have completeness score');
});

test('Default weights are accessible', () => {
  const weights = CombinedValidationReport.getDefaultWeights();
  assert.ok(weights.shaclCompliance > 0);
  assert.ok(weights.nodeCoverage > 0);

  // Weights should sum to ~1.0
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  assert.ok(Math.abs(total - 1.0) < 0.01, `Weights should sum to 1.0, got ${total}`);
});

test('Custom weights override defaults', () => {
  const reporter = new CombinedValidationReport({
    weights: { shaclCompliance: 0.5 }
  });

  // Should merge with defaults
  assert.strictEqual(reporter.options.weights.shaclCompliance, 0.5);
  assert.ok(reporter.options.weights.nodeCoverage > 0, 'Other weights should be preserved');
});

// ═══════════════════════════════════════════════════════════════
// Format Output
// ═══════════════════════════════════════════════════════════════

test('Format produces human-readable output', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({
    graph: mockGraph(5),
    shaclResult: mockShaclResult(88, 0, 1)
  });

  const formatted = reporter.format(report);
  assert.ok(formatted.includes('Combined Validation Report'), 'Should have header');
  assert.ok(formatted.includes('Overall Score'), 'Should show overall score');
  assert.ok(formatted.includes('Internal'), 'Should have internal section');
  assert.ok(formatted.includes('SHACL'), 'Should have external section');
});

test('Format handles missing SHACL gracefully', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({ graph: mockGraph(5) });

  const formatted = reporter.format(report);
  assert.ok(formatted.includes('Not available'), 'Should note SHACL not available');
});

// ═══════════════════════════════════════════════════════════════
// Edge Cases
// ═══════════════════════════════════════════════════════════════

test('Handles empty graph', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({ graph: { '@graph': [] } });

  assert.ok(report.validation.combined.overallScore >= 0);
  assert.ok(report.validation.internal.nodeCount === 0);
});

test('Handles null graph', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({ graph: null });

  assert.ok(report.validation.combined.overallScore >= 0);
});

test('Handles graph without @graph key', () => {
  const reporter = new CombinedValidationReport();
  const report = reporter.generate({ graph: { nodes: [] } });

  assert.ok(report.validation.combined.overallScore >= 0);
});

test('Details excluded when includeDetails is false', () => {
  const reporter = new CombinedValidationReport({ includeDetails: false });
  const report = reporter.generate({
    graph: mockGraph(5, { hedged: true }),
    shaclResult: mockShaclResult(90)
  });

  assert.strictEqual(report.details, undefined, 'Should not include details');
});

// Run tests
runTests();
