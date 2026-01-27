/**
 * @file src/graph/ValidationReport.js
 * @description Phase 6.4.5 - ValidationReport class
 *
 * Structured validation report with errors, warnings, and info messages.
 * Used by OntologyValidator to return validation results.
 *
 * @example
 * const report = new ValidationReport();
 * report.addError({ code: 'MISSING_DOMAIN', message: 'Missing domain field' });
 * console.log(report.isValid()); // false
 * console.log(report.toString()); // Human readable output
 */

class ValidationReport {
  constructor() {
    this.errors = [];      // Must fix - loading may fail
    this.warnings = [];    // Should fix - may cause issues
    this.info = [];        // Suggestions - optional improvements
    this.valid = true;     // Overall validity
    this.timestamp = new Date().toISOString();
  }

  /**
   * Check if report has any errors
   * @returns {boolean}
   */
  hasErrors() {
    return this.errors.length > 0;
  }

  /**
   * Check if report has any warnings
   * @returns {boolean}
   */
  hasWarnings() {
    return this.warnings.length > 0;
  }

  /**
   * Check if report has any info messages
   * @returns {boolean}
   */
  hasInfo() {
    return this.info.length > 0;
  }

  /**
   * Check if config is valid (no errors)
   * @returns {boolean}
   */
  isValid() {
    return this.valid;
  }

  /**
   * Add an error to the report
   * @param {Object} issue - Validation issue
   * @param {string} issue.code - Machine-readable error code
   * @param {string} issue.message - Human-readable message
   * @param {string} [issue.path] - JSON path to the issue
   * @param {*} [issue.value] - Actual value found
   * @param {*} [issue.expected] - Expected value/type
   * @param {string} [issue.suggestion] - Suggested fix
   */
  addError(issue) {
    if (!issue) return;

    this.errors.push({
      severity: 'error',
      code: issue.code || 'UNKNOWN_ERROR',
      message: issue.message || 'Unknown error',
      path: issue.path || null,
      value: issue.value,
      expected: issue.expected,
      suggestion: issue.suggestion
    });

    this.valid = false;
  }

  /**
   * Add a warning to the report
   * @param {Object} issue - Validation issue (same structure as error)
   */
  addWarning(issue) {
    if (!issue) return;

    this.warnings.push({
      severity: 'warning',
      code: issue.code || 'UNKNOWN_WARNING',
      message: issue.message || 'Unknown warning',
      path: issue.path || null,
      value: issue.value,
      expected: issue.expected,
      suggestion: issue.suggestion
    });
  }

  /**
   * Add an info message to the report
   * @param {Object} issue - Validation issue (same structure as error)
   */
  addInfo(issue) {
    if (!issue) return;

    this.info.push({
      severity: 'info',
      code: issue.code || 'INFO',
      message: issue.message || 'Information',
      path: issue.path || null,
      value: issue.value,
      expected: issue.expected,
      suggestion: issue.suggestion
    });
  }

  /**
   * Add multiple issues at once
   * @param {Array} issues - Array of validation issues with severity
   */
  addIssues(issues) {
    if (!issues || !Array.isArray(issues)) return;

    for (const issue of issues) {
      if (issue.severity === 'error') {
        this.addError(issue);
      } else if (issue.severity === 'warning') {
        this.addWarning(issue);
      } else {
        this.addInfo(issue);
      }
    }
  }

  /**
   * Merge another report into this one
   * @param {ValidationReport} other - Report to merge
   */
  merge(other) {
    if (!other) return;

    this.errors.push(...(other.errors || []));
    this.warnings.push(...(other.warnings || []));
    this.info.push(...(other.info || []));

    if (other.errors && other.errors.length > 0) {
      this.valid = false;
    }
  }

  /**
   * Get all issues (errors + warnings + info)
   * @returns {Array} All issues
   */
  getAllIssues() {
    return [
      ...this.errors,
      ...this.warnings,
      ...this.info
    ];
  }

  /**
   * Get issue count
   * @returns {Object} Counts by type
   */
  getCounts() {
    return {
      errors: this.errors.length,
      warnings: this.warnings.length,
      info: this.info.length,
      total: this.errors.length + this.warnings.length + this.info.length
    };
  }

  /**
   * Convert to JSON structure
   * @returns {Object}
   */
  toJSON() {
    return {
      valid: this.valid,
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      infoCount: this.info.length,
      errors: this.errors,
      warnings: this.warnings,
      info: this.info,
      timestamp: this.timestamp
    };
  }

  /**
   * Convert to human-readable string
   * @returns {string}
   */
  toString() {
    const lines = [`Validation Report (${this.valid ? 'VALID' : 'INVALID'})`];
    lines.push(`Generated: ${this.timestamp}`);
    lines.push('');

    if (this.errors.length > 0) {
      lines.push(`Errors (${this.errors.length}):`);
      this.errors.forEach(e => {
        lines.push(`  [ERROR] ${e.code}: ${e.message}`);
        if (e.path) lines.push(`          Path: ${e.path}`);
        if (e.suggestion) lines.push(`          Suggestion: ${e.suggestion}`);
      });
      lines.push('');
    }

    if (this.warnings.length > 0) {
      lines.push(`Warnings (${this.warnings.length}):`);
      this.warnings.forEach(w => {
        lines.push(`  [WARN] ${w.code}: ${w.message}`);
        if (w.path) lines.push(`         Path: ${w.path}`);
        if (w.suggestion) lines.push(`         Suggestion: ${w.suggestion}`);
      });
      lines.push('');
    }

    if (this.info.length > 0) {
      lines.push(`Info (${this.info.length}):`);
      this.info.forEach(i => {
        lines.push(`  [INFO] ${i.code}: ${i.message}`);
      });
      lines.push('');
    }

    if (this.errors.length === 0 && this.warnings.length === 0 && this.info.length === 0) {
      lines.push('No issues found.');
    }

    return lines.join('\n');
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ValidationReport;
}
if (typeof window !== 'undefined') {
  window.ValidationReport = ValidationReport;
}
