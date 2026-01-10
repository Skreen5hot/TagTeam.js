/**
 * TagTeam Validator
 *
 * Validates TagTeam semantic parser output against expected test corpus results.
 *
 * Usage:
 *   import { validateTagTeamOutput, runFullValidation } from './tagteam-validator.js';
 *
 *   // Single scenario validation
 *   const result = validateTagTeamOutput(parsedOutput, expectedOutput);
 *
 *   // Full corpus validation
 *   const results = runFullValidation(testCorpus, parserFunction);
 */

/**
 * Validates a single TagTeam parser output against expected results.
 *
 * @param {Object} tagteamOutput - The parsed output from TagTeam
 * @param {Object} expectedOutput - The expected parse from test corpus
 * @returns {Object} Validation results with pass/fail and detailed errors
 */
export function validateTagTeamOutput(tagteamOutput, expectedOutput) {
  const results = {
    passed: true,
    errors: [],
    warnings: [],
    scores: {
      agentMatch: 0,
      actionMatch: 0,
      patientMatch: 0,
      negationMatch: 0,
      modalityMatch: 0,
      confidenceValid: 0,
      overall: 0
    }
  };

  // Validate agent extraction
  if (!tagteamOutput.agent) {
    results.passed = false;
    results.errors.push({
      field: 'agent',
      message: 'Agent is missing from parse output',
      expected: expectedOutput.agent
    });
  } else {
    if (tagteamOutput.agent.entity !== expectedOutput.agent.entity) {
      results.passed = false;
      results.errors.push({
        field: 'agent.entity',
        expected: expectedOutput.agent.entity,
        actual: tagteamOutput.agent.entity,
        message: `Agent entity mismatch`
      });
    } else {
      results.scores.agentMatch = 1;
    }

    if (tagteamOutput.agent.role !== expectedOutput.agent.role) {
      results.warnings.push({
        field: 'agent.role',
        expected: expectedOutput.agent.role,
        actual: tagteamOutput.agent.role,
        message: 'Agent role mismatch (warning only)'
      });
    }
  }

  // Validate action extraction
  if (!tagteamOutput.action) {
    results.passed = false;
    results.errors.push({
      field: 'action',
      message: 'Action is missing from parse output',
      expected: expectedOutput.action
    });
  } else {
    // Check verb lemma (more important than surface form)
    if (tagteamOutput.action.lemma !== expectedOutput.action.lemma) {
      results.passed = false;
      results.errors.push({
        field: 'action.lemma',
        expected: expectedOutput.action.lemma,
        actual: tagteamOutput.action.lemma,
        message: 'Action lemma mismatch'
      });
    } else {
      results.scores.actionMatch = 1;
    }

    // Check tense (important for temporal reasoning)
    if (tagteamOutput.action.tense !== expectedOutput.action.tense) {
      results.warnings.push({
        field: 'action.tense',
        expected: expectedOutput.action.tense,
        actual: tagteamOutput.action.tense,
        message: 'Tense mismatch (warning only)'
      });
    }

    // Check modality (critical for moral reasoning - "must" vs "should" vs "can")
    if (expectedOutput.action.modality) {
      if (tagteamOutput.action.modality !== expectedOutput.action.modality) {
        results.errors.push({
          field: 'action.modality',
          expected: expectedOutput.action.modality,
          actual: tagteamOutput.action.modality || 'none',
          message: 'Modality mismatch - affects moral interpretation'
        });
        // Don't fail on modality mismatch for Week 1, just flag it
      } else {
        results.scores.modalityMatch = 1;
      }
    }
  }

  // Validate patient extraction (optional - some actions have no patient)
  if (expectedOutput.patient) {
    if (!tagteamOutput.patient) {
      results.passed = false;
      results.errors.push({
        field: 'patient',
        message: 'Patient is missing but expected',
        expected: expectedOutput.patient
      });
    } else {
      if (tagteamOutput.patient.entity !== expectedOutput.patient.entity) {
        results.passed = false;
        results.errors.push({
          field: 'patient.entity',
          expected: expectedOutput.patient.entity,
          actual: tagteamOutput.patient.entity,
          message: 'Patient entity mismatch'
        });
      } else {
        results.scores.patientMatch = 1;
      }
    }
  } else if (tagteamOutput.patient) {
    results.warnings.push({
      field: 'patient',
      message: 'Patient extracted but not expected in test corpus',
      actual: tagteamOutput.patient
    });
  }

  // Validate negation detection (CRITICAL for moral reasoning)
  if (tagteamOutput.action && expectedOutput.action) {
    if (tagteamOutput.action.negation !== expectedOutput.action.negation) {
      results.passed = false;
      results.errors.push({
        field: 'action.negation',
        expected: expectedOutput.action.negation,
        actual: tagteamOutput.action.negation,
        message: 'CRITICAL: Negation mismatch - "not harmful" vs "harmful" completely changes meaning',
        severity: 'critical'
      });
    } else {
      results.scores.negationMatch = 1;
    }
  }

  // Validate confidence score (must be between 0 and 1)
  if (typeof tagteamOutput.confidence !== 'number') {
    results.passed = false;
    results.errors.push({
      field: 'confidence',
      message: 'Confidence must be a number',
      actual: typeof tagteamOutput.confidence
    });
  } else if (tagteamOutput.confidence < 0 || tagteamOutput.confidence > 1) {
    results.passed = false;
    results.errors.push({
      field: 'confidence',
      message: 'Confidence must be between 0 and 1',
      actual: tagteamOutput.confidence
    });
  } else {
    results.scores.confidenceValid = 1;
  }

  // Validate semantic frame (optional for Week 1)
  if (expectedOutput.semanticFrame) {
    if (tagteamOutput.semanticFrame !== expectedOutput.semanticFrame) {
      results.warnings.push({
        field: 'semanticFrame',
        expected: expectedOutput.semanticFrame,
        actual: tagteamOutput.semanticFrame,
        message: 'Semantic frame mismatch (not critical for Week 1)'
      });
    }
  }

  // Calculate overall score
  const scoreFields = ['agentMatch', 'actionMatch', 'patientMatch', 'negationMatch', 'confidenceValid'];
  const totalScore = scoreFields.reduce((sum, field) => sum + results.scores[field], 0);
  const maxScore = expectedOutput.patient ? 5 : 4; // Patient is optional
  results.scores.overall = totalScore / maxScore;

  return results;
}

/**
 * Validates context intensity analysis against expected values.
 *
 * @param {Object} tagteamContext - Parsed context from TagTeam
 * @param {Object} expectedContext - Expected context from test corpus
 * @returns {Object} Validation results
 */
export function validateContextAnalysis(tagteamContext, expectedContext) {
  const results = {
    passed: true,
    errors: [],
    warnings: [],
    scores: {}
  };

  const INTENSITY_TOLERANCE = 0.2; // Allow ±0.2 difference in intensity

  for (const [dimension, expected] of Object.entries(expectedContext)) {
    if (!tagteamContext[dimension]) {
      results.warnings.push({
        field: dimension,
        message: `Context dimension '${dimension}' not detected`,
        expected: expected
      });
      results.scores[dimension] = 0;
      continue;
    }

    const actual = tagteamContext[dimension];

    // Check intensity (within tolerance)
    const intensityDiff = Math.abs(actual.intensity - expected.intensity);
    if (intensityDiff > INTENSITY_TOLERANCE) {
      results.errors.push({
        field: `${dimension}.intensity`,
        expected: expected.intensity,
        actual: actual.intensity,
        difference: intensityDiff,
        message: `Intensity difference ${intensityDiff.toFixed(2)} exceeds tolerance ${INTENSITY_TOLERANCE}`
      });
      results.scores[dimension] = 0;
    } else {
      results.scores[dimension] = 1 - (intensityDiff / INTENSITY_TOLERANCE); // Partial credit
    }

    // Check polarity
    if (actual.polarity !== expected.polarity) {
      results.warnings.push({
        field: `${dimension}.polarity`,
        expected: expected.polarity,
        actual: actual.polarity,
        message: 'Polarity mismatch (warning only for Week 1)'
      });
    }
  }

  // Calculate overall context score
  const scoreValues = Object.values(results.scores);
  results.scores.overall = scoreValues.length > 0
    ? scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length
    : 0;

  return results;
}

/**
 * Validates value matching against expected relevant values.
 *
 * @param {Array} tagteamValues - Matched values from TagTeam
 * @param {Array} expectedValues - Expected values from test corpus
 * @returns {Object} Validation results
 */
export function validateValueMatching(tagteamValues, expectedValues) {
  const results = {
    passed: true,
    errors: [],
    warnings: [],
    scores: {
      precision: 0,
      recall: 0,
      f1: 0
    },
    matches: {
      truePositives: [],
      falsePositives: [],
      falseNegatives: []
    }
  };

  const expectedValueNames = expectedValues
    .filter(v => v.expectedRelevance)
    .map(v => v.value);

  const tagteamValueNames = tagteamValues.map(v => v.value);

  // Calculate true positives, false positives, false negatives
  for (const value of tagteamValueNames) {
    if (expectedValueNames.includes(value)) {
      results.matches.truePositives.push(value);
    } else {
      results.matches.falsePositives.push(value);
      results.warnings.push({
        field: 'value',
        message: `Value '${value}' matched but not expected`,
        actual: value
      });
    }
  }

  for (const value of expectedValueNames) {
    if (!tagteamValueNames.includes(value)) {
      results.matches.falseNegatives.push(value);
      results.errors.push({
        field: 'value',
        message: `Expected value '${value}' not matched`,
        expected: value
      });
    }
  }

  // Calculate precision, recall, F1
  const tp = results.matches.truePositives.length;
  const fp = results.matches.falsePositives.length;
  const fn = results.matches.falseNegatives.length;

  results.scores.precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
  results.scores.recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
  results.scores.f1 = (results.scores.precision + results.scores.recall) > 0
    ? 2 * (results.scores.precision * results.scores.recall) / (results.scores.precision + results.scores.recall)
    : 0;

  // Pass if F1 score >= 0.75
  results.passed = results.scores.f1 >= 0.75;

  return results;
}

/**
 * Runs complete validation across entire test corpus.
 *
 * @param {Array} testCorpus - Array of test scenarios from test-corpus-week1.json
 * @param {Function} tagteamParser - TagTeam parsing function (description) => parsedOutput
 * @returns {Object} Aggregate validation results
 */
export function runFullValidation(testCorpus, tagteamParser) {
  const results = {
    totalScenarios: testCorpus.length,
    passed: 0,
    failed: 0,
    details: [],
    aggregateScores: {
      agentAccuracy: 0,
      actionAccuracy: 0,
      patientAccuracy: 0,
      negationAccuracy: 0,
      overallAccuracy: 0,
      contextAccuracy: 0,
      valueF1: 0
    }
  };

  for (const scenario of testCorpus) {
    try {
      // Parse the scenario using TagTeam
      const parsed = tagteamParser(scenario.description);

      // Validate parse output
      const parseValidation = validateTagTeamOutput(parsed, scenario.expectedParse);

      // Validate context analysis (if TagTeam provides it)
      let contextValidation = null;
      if (parsed.context && scenario.expectedContext) {
        contextValidation = validateContextAnalysis(parsed.context, scenario.expectedContext);
      }

      // Validate value matching (if TagTeam provides it)
      let valueValidation = null;
      if (parsed.values && scenario.expectedValues) {
        valueValidation = validateValueMatching(parsed.values, scenario.expectedValues);
      }

      const scenarioResult = {
        scenarioId: scenario.id,
        title: scenario.title,
        parseValidation,
        contextValidation,
        valueValidation,
        overallPassed: parseValidation.passed &&
                       (!contextValidation || contextValidation.passed) &&
                       (!valueValidation || valueValidation.passed)
      };

      results.details.push(scenarioResult);

      if (scenarioResult.overallPassed) {
        results.passed++;
      } else {
        results.failed++;
      }

      // Aggregate scores
      results.aggregateScores.agentAccuracy += parseValidation.scores.agentMatch;
      results.aggregateScores.actionAccuracy += parseValidation.scores.actionMatch;
      results.aggregateScores.patientAccuracy += parseValidation.scores.patientMatch;
      results.aggregateScores.negationAccuracy += parseValidation.scores.negationMatch;
      results.aggregateScores.overallAccuracy += parseValidation.scores.overall;

      if (contextValidation) {
        results.aggregateScores.contextAccuracy += contextValidation.scores.overall;
      }

      if (valueValidation) {
        results.aggregateScores.valueF1 += valueValidation.scores.f1;
      }

    } catch (error) {
      results.failed++;
      results.details.push({
        scenarioId: scenario.id,
        title: scenario.title,
        error: error.message,
        overallPassed: false
      });
    }
  }

  // Calculate final aggregates
  const total = results.totalScenarios;
  results.aggregateScores.agentAccuracy = (results.aggregateScores.agentAccuracy / total * 100).toFixed(1) + '%';
  results.aggregateScores.actionAccuracy = (results.aggregateScores.actionAccuracy / total * 100).toFixed(1) + '%';
  results.aggregateScores.patientAccuracy = (results.aggregateScores.patientAccuracy / total * 100).toFixed(1) + '%';
  results.aggregateScores.negationAccuracy = (results.aggregateScores.negationAccuracy / total * 100).toFixed(1) + '%';
  results.aggregateScores.overallAccuracy = (results.aggregateScores.overallAccuracy / total * 100).toFixed(1) + '%';
  results.aggregateScores.contextAccuracy = (results.aggregateScores.contextAccuracy / total * 100).toFixed(1) + '%';
  results.aggregateScores.valueF1 = (results.aggregateScores.valueF1 / total * 100).toFixed(1) + '%';

  results.passRate = (results.passed / total * 100).toFixed(1) + '%';

  return results;
}

/**
 * Generates a human-readable validation report.
 *
 * @param {Object} validationResults - Results from runFullValidation
 * @returns {string} Formatted report
 */
export function generateReport(validationResults) {
  let report = '='.repeat(80) + '\n';
  report += 'TagTeam Validation Report\n';
  report += '='.repeat(80) + '\n\n';

  report += `Total Scenarios: ${validationResults.totalScenarios}\n`;
  report += `Passed: ${validationResults.passed}\n`;
  report += `Failed: ${validationResults.failed}\n`;
  report += `Pass Rate: ${validationResults.passRate}\n\n`;

  report += 'Aggregate Accuracy Scores:\n';
  report += '-'.repeat(80) + '\n';
  report += `  Agent Extraction: ${validationResults.aggregateScores.agentAccuracy}\n`;
  report += `  Action Extraction: ${validationResults.aggregateScores.actionAccuracy}\n`;
  report += `  Patient Extraction: ${validationResults.aggregateScores.patientAccuracy}\n`;
  report += `  Negation Detection: ${validationResults.aggregateScores.negationAccuracy}\n`;
  report += `  Overall Parse Accuracy: ${validationResults.aggregateScores.overallAccuracy}\n`;
  report += `  Context Analysis: ${validationResults.aggregateScores.contextAccuracy}\n`;
  report += `  Value Matching (F1): ${validationResults.aggregateScores.valueF1}\n\n`;

  report += 'Per-Scenario Results:\n';
  report += '-'.repeat(80) + '\n';
  for (const detail of validationResults.details) {
    const status = detail.overallPassed ? '✓ PASS' : '✗ FAIL';
    report += `  [${status}] ${detail.scenarioId}: ${detail.title}\n`;

    if (!detail.overallPassed && detail.parseValidation) {
      for (const error of detail.parseValidation.errors) {
        report += `         ERROR: ${error.field} - ${error.message}\n`;
      }
    }

    if (detail.error) {
      report += `         EXCEPTION: ${detail.error}\n`;
    }
  }

  report += '\n' + '='.repeat(80) + '\n';

  return report;
}

// Export for use in test suites
export default {
  validateTagTeamOutput,
  validateContextAnalysis,
  validateValueMatching,
  runFullValidation,
  generateReport
};
