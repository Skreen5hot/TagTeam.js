/**
 * CombinedValidationReport.js
 *
 * Phase 9.3: Unified validation report combining internal self-assessment
 * and external SHACL validation into a single diagnostic output.
 *
 * Aggregates:
 * - Internal: node coverage, parse metrics, complexity budget usage
 * - External: SHACL compliance score, pattern violations
 * - Phase 7: Certainty and source attribution summaries
 * - Ambiguity: ambiguity detection summary
 *
 * @module graph/CombinedValidationReport
 * @version 1.0.0
 */

/**
 * Recommendation thresholds
 */
const THRESHOLDS = {
  EXCELLENT: 0.90,
  GOOD: 0.75,
  ACCEPTABLE: 0.60,
  POOR: 0.40
};

/**
 * Weights for combined score calculation
 */
const SCORE_WEIGHTS = {
  shaclCompliance: 0.35,    // Ontological correctness is most important
  nodeCoverage: 0.25,       // How much of the input produced output
  budgetHealth: 0.15,       // Whether complexity stayed within bounds
  ambiguityClarity: 0.15,   // Low ambiguity = higher clarity
  completeness: 0.10        // Structural completeness (acts linked to agents, etc.)
};

class CombinedValidationReport {
  /**
   * Create a CombinedValidationReport
   * @param {Object} [options] - Configuration options
   * @param {Object} [options.weights] - Custom score weights
   * @param {boolean} [options.includeDetails=true] - Include detailed breakdowns
   */
  constructor(options = {}) {
    this.options = {
      includeDetails: options.includeDetails !== undefined ? options.includeDetails : true,
      weights: { ...SCORE_WEIGHTS, ...(options.weights || {}) }
    };

    this._sections = {};
    this._timestamp = new Date().toISOString();
  }

  /**
   * Generate a combined validation report from a build result and validators
   * @param {Object} params - Report generation parameters
   * @param {Object} params.graph - The built graph (from SemanticGraphBuilder.build())
   * @param {Object} [params.shaclResult] - Result from SHMLValidator.validate()
   * @param {Object} [params.budgetUsage] - Result from ComplexityBudget.getUsage()
   * @param {Object} [params.ambiguityReport] - AmbiguityReport instance or null
   * @param {string} [params.inputText] - Original input text
   * @returns {Object} Combined validation report
   */
  generate(params) {
    const { graph, shaclResult, budgetUsage, ambiguityReport, inputText } = params;

    const nodes = graph?.['@graph'] || graph?.nodes || [];
    const metadata = graph?._metadata || {};

    // Build each section
    const internal = this._buildInternalAssessment(nodes, metadata, inputText);
    const external = this._buildExternalAssessment(shaclResult);
    const budget = this._buildBudgetAssessment(budgetUsage);
    const ambiguity = this._buildAmbiguityAssessment(ambiguityReport);
    const phase7 = this._buildPhase7Summary(nodes);
    const completeness = this._buildCompletenessCheck(nodes);

    // Calculate combined score
    const combined = this._calculateCombinedScore({
      internal, external, budget, ambiguity, completeness
    });

    const report = {
      '@type': 'tagteam:CombinedValidationReport',
      'tagteam:timestamp': this._timestamp,
      'tagteam:version': '1.0.0',
      validation: {
        internal: {
          selfAssessmentScore: internal.score,
          nodeCount: internal.nodeCount,
          coverageRatio: internal.coverageRatio,
          entityCount: internal.entityCount,
          actCount: internal.actCount
        },
        external: {
          shaclValidationScore: external.score,
          compliancePercentage: external.compliancePercentage,
          violationCount: external.violationCount,
          warningCount: external.warningCount
        },
        budget: {
          withinBudget: budget.withinBudget,
          usagePercentage: budget.usagePercentage,
          truncated: budget.truncated
        },
        combined: {
          overallScore: combined.overallScore,
          grade: combined.grade,
          recommendation: combined.recommendation,
          breakdown: combined.breakdown
        }
      }
    };

    // Add optional detail sections
    if (this.options.includeDetails) {
      report.details = {};

      if (external.patternScores) {
        report.details.shaclPatterns = external.patternScores;
      }
      if (ambiguity.count > 0) {
        report.details.ambiguity = {
          count: ambiguity.count,
          hasCritical: ambiguity.hasCritical,
          byType: ambiguity.byType
        };
      }
      if (phase7.hasCertainty || phase7.hasAttribution) {
        report.details.phase7 = phase7;
      }
      if (completeness.issues.length > 0) {
        report.details.completeness = completeness.issues;
      }
    }

    return report;
  }

  /**
   * Build internal self-assessment metrics
   * @private
   */
  _buildInternalAssessment(nodes, metadata, inputText) {
    const nodesArray = Array.isArray(nodes) ? nodes : [];

    // Count node types
    const entityCount = nodesArray.filter(n => {
      const types = n['@type'] || [];
      return types.includes('tagteam:DiscourseReferent');
    }).length;

    const actCount = nodesArray.filter(n => {
      const types = n['@type'] || [];
      return types.some(t => t.startsWith('cco:ActOf') || t === 'cco:IntentionalAct');
    }).length;

    const roleCount = nodesArray.filter(n => {
      const types = n['@type'] || [];
      return types.some(t => t.includes('Role'));
    }).length;

    // Coverage: ratio of nodes to input length (heuristic)
    const inputLength = inputText?.length || metadata.inputLength || 0;
    const expectedNodes = Math.max(1, Math.floor(inputLength / 20)); // ~1 node per 20 chars
    const coverageRatio = Math.min(1.0, nodesArray.length / expectedNodes);

    // Score: weighted combination of coverage and structural richness
    const hasEntities = entityCount > 0 ? 1 : 0;
    const hasActs = actCount > 0 ? 1 : 0;
    const hasRoles = roleCount > 0 ? 1 : 0;
    const structuralScore = (hasEntities * 0.4 + hasActs * 0.4 + hasRoles * 0.2);
    const score = Math.round((coverageRatio * 0.5 + structuralScore * 0.5) * 100) / 100;

    return {
      score,
      nodeCount: nodesArray.length,
      entityCount,
      actCount,
      roleCount,
      coverageRatio: Math.round(coverageRatio * 100) / 100,
      inputLength
    };
  }

  /**
   * Build external SHACL validation assessment
   * @private
   */
  _buildExternalAssessment(shaclResult) {
    if (!shaclResult) {
      return {
        score: null,
        compliancePercentage: null,
        violationCount: 0,
        warningCount: 0,
        patternScores: null,
        available: false
      };
    }

    const compliancePercentage = shaclResult.complianceScore || 0;
    const score = Math.round(compliancePercentage) / 100;

    // Extract pattern-level scores
    const patternScores = {};
    if (shaclResult.patterns) {
      for (const [name, data] of Object.entries(shaclResult.patterns)) {
        patternScores[name] = {
          passed: data.passed,
          total: data.total,
          score: data.score
        };
      }
    }

    return {
      score,
      compliancePercentage,
      violationCount: shaclResult.violations?.length || 0,
      warningCount: shaclResult.warnings?.length || 0,
      patternScores: Object.keys(patternScores).length > 0 ? patternScores : null,
      available: true
    };
  }

  /**
   * Build complexity budget assessment
   * @private
   */
  _buildBudgetAssessment(budgetUsage) {
    if (!budgetUsage) {
      return {
        withinBudget: true,
        usagePercentage: 0,
        truncated: false,
        score: 1.0,
        available: false
      };
    }

    const nodeUsage = budgetUsage.nodes?.percentage || 0;
    const truncated = budgetUsage.truncated || false;
    const exceeded = budgetUsage.exceeded || false;

    // Budget health score: 1.0 if well within budget, decreases as usage grows
    let score = 1.0;
    if (exceeded) {
      score = 0.3;
    } else if (truncated) {
      score = 0.5;
    } else if (nodeUsage > 80) {
      score = 0.7;
    } else if (nodeUsage > 60) {
      score = 0.85;
    }

    return {
      withinBudget: !exceeded,
      usagePercentage: Math.round(nodeUsage),
      truncated,
      score,
      available: true
    };
  }

  /**
   * Build ambiguity assessment
   * @private
   */
  _buildAmbiguityAssessment(ambiguityReport) {
    if (!ambiguityReport || !ambiguityReport.hasAmbiguities || !ambiguityReport.hasAmbiguities()) {
      return {
        count: 0,
        hasCritical: false,
        score: 1.0, // No ambiguity = perfect clarity
        byType: {},
        available: !!ambiguityReport
      };
    }

    const count = ambiguityReport.count || 0;
    const hasCritical = ambiguityReport.hasCriticalAmbiguities?.() || false;

    // Clarity score: decreases with more ambiguities
    let score = 1.0;
    if (hasCritical) {
      score = 0.4;
    } else if (count > 5) {
      score = 0.6;
    } else if (count > 2) {
      score = 0.75;
    } else if (count > 0) {
      score = 0.85;
    }

    const byType = ambiguityReport.statistics?.byType || {};

    return {
      count,
      hasCritical,
      score,
      byType,
      available: true
    };
  }

  /**
   * Build Phase 7 summary (certainty + attribution)
   * @private
   */
  _buildPhase7Summary(nodes) {
    const nodesArray = Array.isArray(nodes) ? nodes : [];

    // Certainty markers
    const hedgedNodes = nodesArray.filter(n => n['tagteam:isHedged'] === true);
    const boostedNodes = nodesArray.filter(n => n['tagteam:isBoosted'] === true);
    const evidentialNodes = nodesArray.filter(n => n['tagteam:isEvidential'] === true);
    const hasCertainty = hedgedNodes.length > 0 || boostedNodes.length > 0 || evidentialNodes.length > 0;

    // Source attributions
    const attributionNodes = nodesArray.filter(n => {
      const types = n['@type'] || [];
      return types.includes('tagteam:SourceAttribution');
    });
    const hasAttribution = attributionNodes.length > 0;

    return {
      hasCertainty,
      certainty: {
        hedgedCount: hedgedNodes.length,
        boostedCount: boostedNodes.length,
        evidentialCount: evidentialNodes.length
      },
      hasAttribution,
      attribution: {
        count: attributionNodes.length,
        types: [...new Set(attributionNodes.map(n => n['tagteam:attributionType']).filter(Boolean))]
      }
    };
  }

  /**
   * Build structural completeness check
   * @private
   */
  _buildCompletenessCheck(nodes) {
    const nodesArray = Array.isArray(nodes) ? nodes : [];
    const issues = [];

    // Check: Acts should have agents
    const acts = nodesArray.filter(n => {
      const types = n['@type'] || [];
      return types.some(t => t.startsWith('cco:ActOf') || t === 'cco:IntentionalAct');
    });
    const actsWithoutAgent = acts.filter(a => !a['cco:has_agent']);
    if (actsWithoutAgent.length > 0) {
      issues.push({
        type: 'missing_agent',
        count: actsWithoutAgent.length,
        message: `${actsWithoutAgent.length} act(s) without agent`
      });
    }

    // Check: Entities should have denotesType
    const entities = nodesArray.filter(n => {
      const types = n['@type'] || [];
      return types.includes('tagteam:DiscourseReferent');
    });
    const entitiesWithoutType = entities.filter(e => !e['tagteam:denotesType']);
    if (entitiesWithoutType.length > 0) {
      issues.push({
        type: 'missing_denotes_type',
        count: entitiesWithoutType.length,
        message: `${entitiesWithoutType.length} entity(ies) without denotesType`
      });
    }

    // Check: IBE node should exist
    const hasIBE = nodesArray.some(n => {
      const types = n['@type'] || [];
      return types.includes('cco:InformationBearingEntity');
    });
    if (!hasIBE && nodesArray.length > 0) {
      issues.push({
        type: 'missing_ibe',
        count: 1,
        message: 'No InformationBearingEntity node (staircase root)'
      });
    }

    // Completeness score
    const totalChecks = 3;
    const passedChecks = totalChecks - issues.length;
    const score = totalChecks > 0 ? passedChecks / totalChecks : 1.0;

    return {
      score: Math.round(score * 100) / 100,
      issues,
      checksRun: totalChecks,
      checksPassed: passedChecks
    };
  }

  /**
   * Calculate combined overall score
   * @private
   */
  _calculateCombinedScore(sections) {
    const weights = this.options.weights;
    let totalWeight = 0;
    let weightedSum = 0;

    // SHACL compliance
    if (sections.external.available && sections.external.score !== null) {
      weightedSum += sections.external.score * weights.shaclCompliance;
      totalWeight += weights.shaclCompliance;
    }

    // Node coverage
    weightedSum += sections.internal.score * weights.nodeCoverage;
    totalWeight += weights.nodeCoverage;

    // Budget health
    if (sections.budget.available) {
      weightedSum += sections.budget.score * weights.budgetHealth;
      totalWeight += weights.budgetHealth;
    }

    // Ambiguity clarity
    if (sections.ambiguity.available) {
      weightedSum += sections.ambiguity.score * weights.ambiguityClarity;
      totalWeight += weights.ambiguityClarity;
    }

    // Completeness
    weightedSum += sections.completeness.score * weights.completeness;
    totalWeight += weights.completeness;

    // Normalize
    const overallScore = totalWeight > 0
      ? Math.round((weightedSum / totalWeight) * 100) / 100
      : 0;

    // Grade and recommendation
    const grade = this._getGrade(overallScore);
    const recommendation = this._getRecommendation(overallScore, sections);

    // Breakdown
    const breakdown = {
      shaclCompliance: sections.external.available ? sections.external.score : null,
      nodeCoverage: sections.internal.score,
      budgetHealth: sections.budget.available ? sections.budget.score : null,
      ambiguityClarity: sections.ambiguity.available ? sections.ambiguity.score : null,
      completeness: sections.completeness.score
    };

    return { overallScore, grade, recommendation, breakdown };
  }

  /**
   * Get letter grade from score
   * @private
   */
  _getGrade(score) {
    if (score >= THRESHOLDS.EXCELLENT) return 'A';
    if (score >= THRESHOLDS.GOOD) return 'B';
    if (score >= THRESHOLDS.ACCEPTABLE) return 'C';
    if (score >= THRESHOLDS.POOR) return 'D';
    return 'F';
  }

  /**
   * Generate recommendation text based on score and sections
   * @private
   */
  _getRecommendation(score, sections) {
    if (score >= THRESHOLDS.EXCELLENT) {
      return 'Graph is well-formed with high ontological compliance. Ready for downstream consumption.';
    }

    const issues = [];

    if (sections.external.available && sections.external.score < 0.75) {
      issues.push('SHACL compliance is low — review ontological patterns');
    }
    if (sections.internal.coverageRatio < 0.5) {
      issues.push('Low node coverage — input may contain unsupported constructions');
    }
    if (sections.budget.truncated) {
      issues.push('Input was truncated due to complexity budget — consider chunking');
    }
    if (sections.ambiguity.hasCritical) {
      issues.push('Critical ambiguities detected — manual review recommended');
    }
    if (sections.completeness.score < 0.7) {
      issues.push('Structural gaps found — some acts lack agents or entities lack types');
    }

    if (issues.length === 0) {
      return 'Graph quality is acceptable. Minor improvements possible.';
    }

    return issues.join('. ') + '.';
  }

  /**
   * Format the report as a human-readable string
   * @param {Object} report - Report from generate()
   * @returns {string} Formatted report
   */
  format(report) {
    const v = report.validation;
    const lines = [];

    lines.push('=== TagTeam Combined Validation Report ===');
    lines.push(`Timestamp: ${report['tagteam:timestamp']}`);
    lines.push('');

    // Combined score
    lines.push(`Overall Score: ${v.combined.overallScore} (Grade: ${v.combined.grade})`);
    lines.push(`Recommendation: ${v.combined.recommendation}`);
    lines.push('');

    // Internal
    lines.push('--- Internal Self-Assessment ---');
    lines.push(`  Score: ${v.internal.selfAssessmentScore}`);
    lines.push(`  Nodes: ${v.internal.nodeCount} | Entities: ${v.internal.entityCount} | Acts: ${v.internal.actCount}`);
    lines.push(`  Coverage: ${v.internal.coverageRatio}`);
    lines.push('');

    // External
    lines.push('--- External SHACL Validation ---');
    if (v.external.shaclValidationScore !== null) {
      lines.push(`  Compliance: ${v.external.compliancePercentage}%`);
      lines.push(`  Violations: ${v.external.violationCount} | Warnings: ${v.external.warningCount}`);
    } else {
      lines.push('  Not available (SHACL validator not run)');
    }
    lines.push('');

    // Budget
    lines.push('--- Complexity Budget ---');
    lines.push(`  Within budget: ${v.budget.withinBudget}`);
    lines.push(`  Usage: ${v.budget.usagePercentage}%`);
    if (v.budget.truncated) {
      lines.push('  WARNING: Input was truncated');
    }
    lines.push('');

    // Score breakdown
    lines.push('--- Score Breakdown ---');
    const bd = v.combined.breakdown;
    if (bd.shaclCompliance !== null) lines.push(`  SHACL Compliance: ${bd.shaclCompliance}`);
    lines.push(`  Node Coverage:    ${bd.nodeCoverage}`);
    if (bd.budgetHealth !== null) lines.push(`  Budget Health:    ${bd.budgetHealth}`);
    if (bd.ambiguityClarity !== null) lines.push(`  Ambiguity Clarity: ${bd.ambiguityClarity}`);
    lines.push(`  Completeness:     ${bd.completeness}`);

    return lines.join('\n');
  }

  /**
   * Get threshold constants
   * @returns {Object} Threshold values
   */
  static getThresholds() {
    return { ...THRESHOLDS };
  }

  /**
   * Get default score weights
   * @returns {Object} Default weights
   */
  static getDefaultWeights() {
    return { ...SCORE_WEIGHTS };
  }
}

module.exports = CombinedValidationReport;
