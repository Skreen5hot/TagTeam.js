'use strict';

/**
 * Security Audit Logger
 *
 * Emits structured JSON log events for security-relevant actions.
 * Downstream systems (SIEM, log aggregators) can parse and alert on these.
 *
 * @module security/audit-logger
 */

class SecurityAuditLogger {
  log(event) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'tagteam',
      ...event
    }));
  }

  ontologyFailure(details) {
    this.log({
      event: 'ONTOLOGY_INTEGRITY_FAILED',
      severity: 'critical',
      file: details.file,
      expected: details.expected,
      actual: details.actual,
      approver: details.approver,
      action: 'PARSING_HALTED'
    });
  }

  inputValidationWarning(details) {
    this.log({
      event: 'INPUT_VALIDATION_WARNING',
      severity: 'warning',
      code: details.code,
      text: details.text
    });
  }
}

module.exports = { SecurityAuditLogger };
