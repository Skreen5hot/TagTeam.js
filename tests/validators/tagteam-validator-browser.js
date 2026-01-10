/**
 * TagTeam Validator - Browser Compatible Version
 *
 * Converted from ES6 module to regular script for browser compatibility
 * Original: tagteam-validator.js (ES6 module)
 */

(function(window) {
    'use strict';

    /**
     * Validates a single TagTeam parser output against expected results.
     */
    function validateTagTeamOutput(tagteamOutput, expectedOutput) {
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
                    message: 'Agent entity mismatch'
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
            // Check verb lemma
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

            // Check tense
            if (tagteamOutput.action.tense !== expectedOutput.action.tense) {
                results.warnings.push({
                    field: 'action.tense',
                    expected: expectedOutput.action.tense,
                    actual: tagteamOutput.action.tense,
                    message: 'Tense mismatch (warning only)'
                });
            }

            // Check modality
            if (expectedOutput.action.modality) {
                if (tagteamOutput.action.modality !== expectedOutput.action.modality) {
                    results.errors.push({
                        field: 'action.modality',
                        expected: expectedOutput.action.modality,
                        actual: tagteamOutput.action.modality || 'none',
                        message: 'Modality mismatch'
                    });
                } else {
                    results.scores.modalityMatch = 1;
                }
            }
        }

        // Validate patient extraction
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
        }

        // Validate negation detection (CRITICAL)
        if (tagteamOutput.action && expectedOutput.action) {
            if (tagteamOutput.action.negation !== expectedOutput.action.negation) {
                results.passed = false;
                results.errors.push({
                    field: 'action.negation',
                    expected: expectedOutput.action.negation,
                    actual: tagteamOutput.action.negation,
                    message: 'CRITICAL: Negation mismatch',
                    severity: 'critical'
                });
            } else {
                results.scores.negationMatch = 1;
            }
        }

        // Validate confidence score
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

        // Validate semantic frame
        if (expectedOutput.semanticFrame) {
            if (tagteamOutput.semanticFrame !== expectedOutput.semanticFrame) {
                results.warnings.push({
                    field: 'semanticFrame',
                    expected: expectedOutput.semanticFrame,
                    actual: tagteamOutput.semanticFrame,
                    message: 'Semantic frame mismatch'
                });
            }
        }

        // Calculate overall score
        const scoreFields = ['agentMatch', 'actionMatch', 'patientMatch', 'negationMatch', 'confidenceValid'];
        const totalScore = scoreFields.reduce((sum, field) => sum + results.scores[field], 0);
        const maxScore = expectedOutput.patient ? 5 : 4;
        results.scores.overall = totalScore / maxScore;

        return results;
    }

    /**
     * Runs complete validation across entire test corpus.
     */
    function runFullValidation(testCorpus, tagteamParser) {
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
                overallAccuracy: 0
            }
        };

        for (const scenario of testCorpus) {
            try {
                // Parse the scenario
                const parsed = tagteamParser(scenario.description);

                // Validate parse output
                const parseValidation = validateTagTeamOutput(parsed, scenario.expectedParse);

                const scenarioResult = {
                    scenarioId: scenario.id,
                    title: scenario.title,
                    parseValidation: parseValidation,
                    overallPassed: parseValidation.passed
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

        results.passRate = (results.passed / total * 100).toFixed(1) + '%';

        return results;
    }

    /**
     * Generates a human-readable validation report.
     */
    function generateReport(validationResults) {
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
        report += `  Overall Parse Accuracy: ${validationResults.aggregateScores.overallAccuracy}\n\n`;

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

    // Export to window
    window.TagTeamValidator = {
        validateTagTeamOutput: validateTagTeamOutput,
        runFullValidation: runFullValidation,
        generateReport: generateReport
    };

})(window);
