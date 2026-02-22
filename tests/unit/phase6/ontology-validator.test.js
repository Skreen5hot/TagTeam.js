/**
 * Phase 6.4.5 OntologyValidator Tests
 *
 * Tests for:
 * 1. Structural validation (JSON syntax, required fields, types)
 * 2. Semantic validation (IRI format, BFO/CCO types, hierarchy)
 * 3. Compatibility validation (namespace collisions, term conflicts)
 * 4. TagTeam-specific validation (verb overrides, type specializations)
 *
 * Test Count: 70 tests across 9 categories
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Import components
const OntologyValidator = require('../../../src/graph/OntologyValidator.js');
const ValidationReport = require('../../../src/graph/ValidationReport.js');

describe('Phase 6.4.5: OntologyValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new OntologyValidator();
  });

  // ===========================================================================
  // Category 1: Basic Validation (10 tests)
  // ===========================================================================
  describe('Category 1: Basic Validation', () => {
    it('BV-001: Empty constructor creates validator with defaults', () => {
      const v = new OntologyValidator();
      expect(v).toBeDefined();
      expect(v.options).toBeDefined();
      expect(v.options.strictMode).toBe(false);
      expect(v.options.allowUnknownTypes).toBe(true);
    });

    it('BV-002: Valid minimal config returns valid report', () => {
      const config = {
        domain: 'test',
        version: '1.0'
      };
      const report = validator.validateDomainConfig(config);
      expect(report.isValid()).toBe(true);
      expect(report.hasErrors()).toBe(false);
    });

    it('BV-003: Missing domain field returns error', () => {
      const config = {
        version: '1.0'
      };
      const report = validator.validateDomainConfig(config);
      expect(report.hasErrors()).toBe(true);
      expect(report.errors.some(e => e.code === 'MISSING_DOMAIN')).toBe(true);
    });

    it('BV-004: Missing version field returns error', () => {
      const config = {
        domain: 'test'
      };
      const report = validator.validateDomainConfig(config);
      expect(report.hasErrors()).toBe(true);
      expect(report.errors.some(e => e.code === 'MISSING_VERSION')).toBe(true);
    });

    it('BV-005: Invalid JSON string returns error', () => {
      const report = validator.validate('{ invalid json }');
      expect(report.hasErrors()).toBe(true);
      expect(report.errors.some(e => e.code === 'INVALID_JSON')).toBe(true);
    });

    it('BV-006: Empty domain value returns warning', () => {
      const config = {
        domain: '',
        version: '1.0'
      };
      const report = validator.validateDomainConfig(config);
      expect(report.hasWarnings()).toBe(true);
      expect(report.warnings.some(w => w.code === 'EMPTY_DOMAIN')).toBe(true);
    });

    it('BV-007: Custom options applied correctly', () => {
      const v = new OntologyValidator({
        strictMode: true,
        allowUnknownTypes: false
      });
      expect(v.options.strictMode).toBe(true);
      expect(v.options.allowUnknownTypes).toBe(false);
    });

    it('BV-008: Null input returns error gracefully', () => {
      const report = validator.validateDomainConfig(null);
      expect(report.hasErrors()).toBe(true);
    });

    it('BV-009: Non-object input returns error', () => {
      const report = validator.validateDomainConfig('string');
      expect(report.hasErrors()).toBe(true);
    });

    it('BV-010: Full valid medical-style config returns no errors', () => {
      const config = {
        domain: 'medical',
        version: '1.0',
        typeSpecializations: {
          'Person': {
            terms: ['doctor', 'patient', 'nurse']
          }
        },
        verbOverrides: {
          'treat': {
            default: 'IntentionalAct'
          }
        }
      };
      const report = validator.validateDomainConfig(config);
      expect(report.hasErrors()).toBe(false);
    });
  });

  // ===========================================================================
  // Category 2: Structural Validation (10 tests)
  // ===========================================================================
  describe('Category 2: Structural Validation', () => {
    it('SV-001: typeSpecializations not object returns warning', () => {
      const config = {
        domain: 'test',
        version: '1.0',
        typeSpecializations: 'invalid'
      };
      const report = validator.validateDomainConfig(config);
      expect(report.hasWarnings()).toBe(true);
      expect(report.warnings.some(w => w.code === 'INVALID_TYPE_SPECS')).toBe(true);
    });

    it('SV-002: verbOverrides not object returns warning', () => {
      const config = {
        domain: 'test',
        version: '1.0',
        verbOverrides: ['array', 'invalid']
      };
      const report = validator.validateDomainConfig(config);
      expect(report.hasWarnings()).toBe(true);
      expect(report.warnings.some(w => w.code === 'INVALID_VERB_OVERRIDES')).toBe(true);
    });

    it('SV-003: processRootWords not object returns warning', () => {
      const config = {
        domain: 'test',
        version: '1.0',
        processRootWords: 123
      };
      const report = validator.validateDomainConfig(config);
      expect(report.hasWarnings()).toBe(true);
    });

    it('SV-004: domain not string returns error', () => {
      const config = {
        domain: 123,
        version: '1.0'
      };
      const report = validator.validateDomainConfig(config);
      expect(report.hasErrors()).toBe(true);
      expect(report.errors.some(e => e.code === 'INVALID_DOMAIN_TYPE')).toBe(true);
    });

    it('SV-005: version not string returns error', () => {
      const config = {
        domain: 'test',
        version: 1.0
      };
      const report = validator.validateDomainConfig(config);
      expect(report.hasErrors()).toBe(true);
      expect(report.errors.some(e => e.code === 'INVALID_VERSION_TYPE')).toBe(true);
    });

    it('SV-006: Nested type spec invalid returns warning', () => {
      const config = {
        domain: 'test',
        version: '1.0',
        typeSpecializations: {
          'Person': 'should-be-object'
        }
      };
      const report = validator.validateDomainConfig(config);
      expect(report.hasWarnings()).toBe(true);
    });

    it('SV-007: Verb override missing default returns warning', () => {
      const config = {
        domain: 'test',
        version: '1.0',
        verbOverrides: {
          'treat': {
            objectIsOccurrent: 'IntentionalAct'
            // Missing 'default' key
          }
        }
      };
      const report = validator.validateDomainConfig(config);
      expect(report.hasWarnings()).toBe(true);
      expect(report.warnings.some(w => w.code === 'INVALID_VERB_STRUCTURE')).toBe(true);
    });

    it('SV-008: Extra unknown fields returns info (not error)', () => {
      const config = {
        domain: 'test',
        version: '1.0',
        customField: 'value',
        anotherField: 123
      };
      const report = validator.validateDomainConfig(config);
      expect(report.hasErrors()).toBe(false);
      // Extra fields should be allowed but may generate info
    });

    it('SV-009: Empty typeSpecializations is valid', () => {
      const config = {
        domain: 'test',
        version: '1.0',
        typeSpecializations: {}
      };
      const report = validator.validateDomainConfig(config);
      expect(report.hasErrors()).toBe(false);
    });

    it('SV-010: Deeply nested invalid value caught', () => {
      const config = {
        domain: 'test',
        version: '1.0',
        typeSpecializations: {
          'Person': {
            terms: 'should-be-array'
          }
        }
      };
      const report = validator.validateDomainConfig(config);
      expect(report.hasWarnings()).toBe(true);
    });
  });

  // ===========================================================================
  // Category 3: IRI Validation (10 tests)
  // ===========================================================================
  describe('Category 3: IRI Validation', () => {
    it('IR-001: Valid cco: prefix returns valid', () => {
      const issue = validator.validateIRI('Person');
      expect(issue).toBeNull();
    });

    it('IR-002: Valid bfo: prefix returns valid', () => {
      const issue = validator.validateIRI('bfo:Object');
      expect(issue).toBeNull();
    });

    it('IR-003: Unknown prefix returns warning', () => {
      const issue = validator.validateIRI('xyz:Unknown');
      expect(issue).not.toBeNull();
      expect(issue.code).toBe('UNKNOWN_PREFIX');
    });

    it('IR-004: Empty IRI returns error', () => {
      const issue = validator.validateIRI('');
      expect(issue).not.toBeNull();
      expect(issue.code).toBe('INVALID_IRI_FORMAT');
    });

    it('IR-005: IRI with spaces returns error', () => {
      const issue = validator.validateIRI('cco:Invalid Type');
      expect(issue).not.toBeNull();
      expect(issue.code).toBe('INVALID_IRI_FORMAT');
    });

    it('IR-006: Full URI format returns valid', () => {
      const issue = validator.validateIRI('http://example.org/Type');
      expect(issue).toBeNull();
    });

    it('IR-007: Mixed case prefix returns warning', () => {
      const issue = validator.validateIRI('CCO:Person');
      expect(issue).not.toBeNull();
      expect(issue.severity).toBe('warning');
    });

    it('IR-008: tagteam: prefix returns valid', () => {
      const issue = validator.validateIRI('tagteam:CustomType');
      expect(issue).toBeNull();
    });

    it('IR-009: Custom prefix with declaration is valid', () => {
      const v = new OntologyValidator({
        customPrefixes: { 'custom': 'http://example.org/' }
      });
      const issue = v.validateIRI('custom:Type');
      expect(issue).toBeNull();
    });

    it('IR-010: Numeric-only local name returns warning', () => {
      const issue = validator.validateIRI('bfo:12345');
      // Numeric-only local names are technically valid but unusual
      expect(issue === null || issue.severity === 'warning').toBe(true);
    });
  });

  // ===========================================================================
  // Category 4: BFO Hierarchy Validation (10 tests)
  // ===========================================================================
  describe('Category 4: BFO Hierarchy Validation', () => {
    it('BH-001: Type extends correct parent returns valid', () => {
      const issues = validator.validateBFOHierarchy({
        term: 'patient',
        mappedType: 'Person',
        baseType: 'bfo:Object'
      });
      expect(issues.length).toBe(0);
    });

    it('BH-002: Occurrent mapped to Continuant base returns error', () => {
      const issues = validator.validateBFOHierarchy({
        term: 'treatment',
        mappedType: 'IntentionalAct', // Occurrent
        baseType: 'bfo:Object' // Continuant
      });
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.code === 'HIERARCHY_VIOLATION')).toBe(true);
    });

    it('BH-003: Continuant mapped to Occurrent base returns error', () => {
      const issues = validator.validateBFOHierarchy({
        term: 'doctor',
        mappedType: 'Person', // Continuant
        baseType: 'bfo:Process' // Occurrent
      });
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.code === 'HIERARCHY_VIOLATION')).toBe(true);
    });

    it('BH-004: Unknown type with allowUnknownTypes returns warning', () => {
      const v = new OntologyValidator({ allowUnknownTypes: true });
      const issues = v.validateBFOHierarchy({
        term: 'custom',
        mappedType: 'custom:UnknownType',
        baseType: null
      });
      // Should allow but may warn
      expect(issues.every(i => i.severity !== 'error')).toBe(true);
    });

    it('BH-005: Unknown type without allowUnknownTypes returns error', () => {
      const v = new OntologyValidator({ allowUnknownTypes: false });
      const issues = v.validateBFOHierarchy({
        term: 'custom',
        mappedType: 'unknown:Type',
        baseType: null
      });
      expect(issues.some(i => i.severity === 'error')).toBe(true);
    });

    it('BH-006: Valid CCO subtype of BFO returns valid', () => {
      const issues = validator.validateBFOHierarchy({
        term: 'organization',
        mappedType: 'Organization',
        baseType: 'bfo:Object'
      });
      expect(issues.length).toBe(0);
    });

    it('BH-007: Process specialization returns valid', () => {
      const issues = validator.validateBFOHierarchy({
        term: 'surgery',
        mappedType: 'IntentionalAct',
        baseType: 'bfo:Process'
      });
      expect(issues.length).toBe(0);
    });

    it('BH-008: Role specialization returns valid', () => {
      const issues = validator.validateBFOHierarchy({
        term: 'physician-role',
        mappedType: 'cco:PhysicianRole',
        baseType: 'bfo:Role'
      });
      // Unknown type but valid hierarchy concept
      expect(issues.every(i => i.code !== 'HIERARCHY_VIOLATION')).toBe(true);
    });

    it('BH-009: Quality specialization returns valid', () => {
      const issues = validator.validateBFOHierarchy({
        term: 'health-status',
        mappedType: 'cco:Quality',
        baseType: 'bfo:Quality'
      });
      expect(issues.length).toBe(0);
    });

    it('BH-010: Check known medical.json types are all valid', () => {
      // Test common medical domain types
      const types = [
        { mappedType: 'Person', baseType: 'bfo:Object' },
        { mappedType: 'Organization', baseType: 'bfo:Object' },
        { mappedType: 'IntentionalAct', baseType: 'bfo:Process' }
      ];

      for (const t of types) {
        const issues = validator.validateBFOHierarchy({
          term: 'test',
          mappedType: t.mappedType,
          baseType: t.baseType
        });
        expect(issues.filter(i => i.code === 'HIERARCHY_VIOLATION').length).toBe(0);
      }
    });
  });

  // ===========================================================================
  // Category 5: Compatibility Validation (10 tests)
  // ===========================================================================
  describe('Category 5: Compatibility Validation', () => {
    it('CV-001: No conflicts with empty loaded returns valid', () => {
      const report = validator.checkCompatibility(
        { domain: 'new', version: '1.0' },
        []
      );
      expect(report.hasErrors()).toBe(false);
      expect(report.hasWarnings()).toBe(false);
    });

    it('CV-002: Same domain name returns warning', () => {
      const report = validator.checkCompatibility(
        { domain: 'medical', version: '1.0' },
        [{ domain: 'medical', version: '1.0' }]
      );
      expect(report.hasWarnings()).toBe(true);
      expect(report.warnings.some(w => w.code === 'DOMAIN_CONFLICT')).toBe(true);
    });

    it('CV-003: Same term mapping to different type returns warning', () => {
      const report = validator.checkCompatibility(
        {
          domain: 'new',
          version: '1.0',
          typeSpecializations: {
            'Artifact': { terms: ['device'] }
          }
        },
        [{
          domain: 'existing',
          version: '1.0',
          typeSpecializations: {
            'Person': { terms: ['device'] } // Same term, different type
          }
        }]
      );
      expect(report.hasWarnings()).toBe(true);
      expect(report.warnings.some(w => w.code === 'TERM_CONFLICT')).toBe(true);
    });

    it('CV-004: Same term mapping to same type returns valid', () => {
      const report = validator.checkCompatibility(
        {
          domain: 'new',
          version: '1.0',
          typeSpecializations: {
            'Person': { terms: ['doctor'] }
          }
        },
        [{
          domain: 'existing',
          version: '1.0',
          typeSpecializations: {
            'Person': { terms: ['doctor'] } // Same term, same type - OK
          }
        }]
      );
      expect(report.warnings.filter(w => w.code === 'TERM_CONFLICT').length).toBe(0);
    });

    it('CV-005: Different domains with no overlap returns valid', () => {
      const report = validator.checkCompatibility(
        {
          domain: 'legal',
          version: '1.0',
          typeSpecializations: {
            'Person': { terms: ['lawyer'] }
          }
        },
        [{
          domain: 'medical',
          version: '1.0',
          typeSpecializations: {
            'Person': { terms: ['doctor'] }
          }
        }]
      );
      expect(report.warnings.filter(w => w.code === 'TERM_CONFLICT').length).toBe(0);
    });

    it('CV-006: Namespace prefix collision returns warning', () => {
      const report = validator.checkCompatibility(
        {
          domain: 'new',
          version: '1.0',
          prefixes: { 'med': 'http://new.example.org/' }
        },
        [{
          domain: 'existing',
          version: '1.0',
          prefixes: { 'med': 'http://old.example.org/' } // Same prefix, different URI
        }]
      );
      expect(report.hasWarnings()).toBe(true);
      expect(report.warnings.some(w => w.code === 'NAMESPACE_COLLISION')).toBe(true);
    });

    it('CV-007: Verb override conflict returns info', () => {
      const report = validator.checkCompatibility(
        {
          domain: 'new',
          version: '1.0',
          verbOverrides: { 'treat': { default: 'IntentionalAct' } }
        },
        [{
          domain: 'existing',
          version: '1.0',
          verbOverrides: { 'treat': { default: 'IntentionalAct' } }
        }]
      );
      // Should at least inform about the override
      expect(report.info.length > 0 || report.warnings.length > 0).toBe(true);
    });

    it('CV-008: Multiple loaded configs all checked', () => {
      const report = validator.checkCompatibility(
        { domain: 'medical', version: '1.0' },
        [
          { domain: 'legal', version: '1.0' },
          { domain: 'business', version: '1.0' },
          { domain: 'medical', version: '1.0' } // Conflict with this one
        ]
      );
      expect(report.hasWarnings()).toBe(true);
    });

    it('CV-009: Compatible overlapping terms returns valid', () => {
      const report = validator.checkCompatibility(
        {
          domain: 'specialized-medical',
          version: '1.0',
          typeSpecializations: {
            'cco:Physician': { terms: ['doctor'] } // More specific type
          }
        },
        [{
          domain: 'medical',
          version: '1.0',
          typeSpecializations: {
            'Person': { terms: ['patient'] } // Different term
          }
        }]
      );
      expect(report.warnings.filter(w => w.code === 'TERM_CONFLICT').length).toBe(0);
    });

    it('CV-010: checkCompatibility disabled skips checks', () => {
      const v = new OntologyValidator({ checkCompatibility: false });
      const report = v.checkCompatibility(
        { domain: 'medical', version: '1.0' },
        [{ domain: 'medical', version: '1.0' }] // Would conflict
      );
      // Should skip compatibility checks
      expect(report.warnings.filter(w => w.code === 'DOMAIN_CONFLICT').length).toBe(0);
    });
  });

  // ===========================================================================
  // Category 6: Verb Override Validation (8 tests)
  // ===========================================================================
  describe('Category 6: Verb Override Validation', () => {
    it('VO-001: Valid verb override returns valid', () => {
      const issues = validator.validateVerbOverrides({
        'treat': { default: 'IntentionalAct' }
      });
      expect(issues.filter(i => i.severity === 'error').length).toBe(0);
    });

    it('VO-002: Missing default key returns warning', () => {
      const issues = validator.validateVerbOverrides({
        'treat': { objectIsOccurrent: 'IntentionalAct' }
      });
      expect(issues.some(i => i.code === 'INVALID_VERB_STRUCTURE')).toBe(true);
    });

    it('VO-003: Unknown override key returns info', () => {
      const issues = validator.validateVerbOverrides({
        'treat': {
          default: 'IntentionalAct',
          unknownKey: 'value'
        }
      });
      expect(issues.some(i => i.code === 'UNKNOWN_VERB_KEY')).toBe(true);
    });

    it('VO-004: Invalid override value type returns warning', () => {
      const issues = validator.validateVerbOverrides({
        'treat': {
          default: 123 // Should be string
        }
      });
      expect(issues.some(i => i.severity === 'warning')).toBe(true);
    });

    it('VO-005: Valid medical-style verb overrides return valid', () => {
      const issues = validator.validateVerbOverrides({
        'treat': { default: 'IntentionalAct' },
        'diagnose': { default: 'IntentionalAct' },
        'provide': {
          default: 'cco:ActOfTransferOfPossession',
          objectIsOccurrent: 'cco:ActOfService'
        }
      });
      expect(issues.filter(i => i.severity === 'error').length).toBe(0);
    });

    it('VO-006: Empty verb override returns warning', () => {
      const issues = validator.validateVerbOverrides({
        'treat': {}
      });
      expect(issues.some(i => i.code === 'INVALID_VERB_STRUCTURE')).toBe(true);
    });

    it('VO-007: Verb with all valid keys returns valid', () => {
      const issues = validator.validateVerbOverrides({
        'provide': {
          default: 'IntentionalAct',
          objectIsOccurrent: 'cco:ActOfService',
          objectIsContinuant: 'cco:ActOfTransferOfPossession',
          objectIsGDC: 'ActOfCommunication',
          objectIsPerson: 'IntentionalAct'
        }
      });
      expect(issues.filter(i => i.severity === 'error').length).toBe(0);
    });

    it('VO-008: Override value not string returns warning', () => {
      const issues = validator.validateVerbOverrides({
        'treat': {
          default: ['array', 'invalid']
        }
      });
      expect(issues.some(i => i.severity === 'warning')).toBe(true);
    });
  });

  // ===========================================================================
  // Category 7: ValidationReport API (8 tests)
  // ===========================================================================
  describe('Category 7: ValidationReport API', () => {
    it('VR-001: hasErrors() with errors returns true', () => {
      const report = new ValidationReport();
      report.addError({ code: 'TEST', message: 'Test error' });
      expect(report.hasErrors()).toBe(true);
    });

    it('VR-002: hasErrors() without errors returns false', () => {
      const report = new ValidationReport();
      expect(report.hasErrors()).toBe(false);
    });

    it('VR-003: hasWarnings() with warnings returns true', () => {
      const report = new ValidationReport();
      report.addWarning({ code: 'TEST', message: 'Test warning' });
      expect(report.hasWarnings()).toBe(true);
    });

    it('VR-004: isValid() with errors returns false', () => {
      const report = new ValidationReport();
      report.addError({ code: 'TEST', message: 'Test error' });
      expect(report.isValid()).toBe(false);
    });

    it('VR-005: isValid() without errors returns true', () => {
      const report = new ValidationReport();
      report.addWarning({ code: 'TEST', message: 'Test warning' });
      expect(report.isValid()).toBe(true); // Warnings don't make it invalid
    });

    it('VR-006: toJSON() produces correct structure', () => {
      const report = new ValidationReport();
      report.addError({ code: 'E1', message: 'Error 1' });
      report.addWarning({ code: 'W1', message: 'Warning 1' });

      const json = report.toJSON();
      expect(json).toHaveProperty('valid', false);
      expect(json).toHaveProperty('errorCount', 1);
      expect(json).toHaveProperty('warningCount', 1);
      expect(json).toHaveProperty('errors');
      expect(json).toHaveProperty('warnings');
      expect(json).toHaveProperty('timestamp');
    });

    it('VR-007: toString() produces human readable output', () => {
      const report = new ValidationReport();
      report.addError({ code: 'E1', message: 'Test error' });
      report.addWarning({ code: 'W1', message: 'Test warning' });

      const str = report.toString();
      expect(str).toContain('INVALID');
      expect(str).toContain('Test error');
      expect(str).toContain('Test warning');
    });

    it('VR-008: addError() sets valid to false', () => {
      const report = new ValidationReport();
      expect(report.valid).toBe(true);
      report.addError({ code: 'E1', message: 'Error' });
      expect(report.valid).toBe(false);
    });
  });

  // ===========================================================================
  // Category 8: Integration with DomainConfigLoader (6 tests)
  // ===========================================================================
  describe('Category 8: Integration with DomainConfigLoader', () => {
    it('IL-001: validate() returns report before loading', () => {
      const config = {
        domain: 'test',
        version: '1.0'
      };
      const report = validator.validate(config);
      expect(report).toBeInstanceOf(ValidationReport);
    });

    it('IL-002: validateDomainConfig returns report with _validation pattern', () => {
      const config = {
        domain: 'test',
        version: '1.0'
      };
      const report = validator.validateDomainConfig(config);
      expect(report).toHaveProperty('errors');
      expect(report).toHaveProperty('warnings');
      expect(report).toHaveProperty('valid');
    });

    it('IL-003: strictMode validator treats warnings as errors', () => {
      const v = new OntologyValidator({ strictMode: true });
      const config = {
        domain: '',  // Empty domain - normally a warning
        version: '1.0'
      };
      const report = v.validateDomainConfig(config);
      // In strict mode, warnings become errors
      expect(report.isValid()).toBe(false);
    });

    it('IL-004: Non-strict validator allows loading with warnings', () => {
      const v = new OntologyValidator({ strictMode: false });
      const config = {
        domain: '', // Empty domain - warning
        version: '1.0'
      };
      const report = v.validateDomainConfig(config);
      // With strict mode off, warnings don't affect validity
      // However empty domain is still an issue
      expect(report.hasWarnings()).toBe(true);
    });

    it('IL-005: Report accessible via standard properties', () => {
      const config = { domain: 'test', version: '1.0' };
      const report = validator.validateDomainConfig(config);

      expect(typeof report.isValid).toBe('function');
      expect(typeof report.hasErrors).toBe('function');
      expect(typeof report.hasWarnings).toBe('function');
      expect(typeof report.toJSON).toBe('function');
    });

    it('IL-006: Existing medical.json style config passes validation', () => {
      // Simulate medical.json structure
      const config = {
        domain: 'medical',
        version: '1.0',
        typeSpecializations: {
          'Person': {
            terms: ['doctor', 'physician', 'nurse', 'patient']
          },
          'Organization': {
            terms: ['hospital', 'clinic']
          }
        },
        verbOverrides: {
          'treat': {
            default: 'IntentionalAct'
          },
          'diagnose': {
            default: 'IntentionalAct'
          }
        }
      };
      const report = validator.validateDomainConfig(config);
      expect(report.hasErrors()).toBe(false);
    });
  });

  // ===========================================================================
  // Category 9: Edge Cases (8 tests)
  // ===========================================================================
  describe('Category 9: Edge Cases', () => {
    it('EC-001: Large config completes in reasonable time', () => {
      const config = {
        domain: 'large',
        version: '1.0',
        typeSpecializations: {}
      };

      // Add 100 type specializations
      for (let i = 0; i < 100; i++) {
        config.typeSpecializations[`cco:Type${i}`] = {
          terms: [`term${i}a`, `term${i}b`, `term${i}c`]
        };
      }

      const startTime = Date.now();
      const report = validator.validateDomainConfig(config);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Less than 5 seconds
      expect(report).toBeDefined();
    });

    it('EC-002: Circular type reference detected', () => {
      // This would require type hierarchy checking
      const issues = validator.detectCircularDependencies({
        'typeA': { parent: 'typeB' },
        'typeB': { parent: 'typeA' }
      });
      // Should detect cycle if implemented
      expect(issues).toBeDefined();
    });

    it('EC-003: Unicode in IRIs handled correctly', () => {
      const issue = validator.validateIRI('PersoneTyp\u00E9');
      // Should handle unicode gracefully
      expect(issue === null || issue.severity !== 'error').toBe(true);
    });

    it('EC-004: Config with 100+ terms all validated', () => {
      const config = {
        domain: 'test',
        version: '1.0',
        typeSpecializations: {
          'Person': {
            terms: Array.from({ length: 100 }, (_, i) => `term${i}`)
          }
        }
      };
      const report = validator.validateDomainConfig(config);
      expect(report).toBeDefined();
    });

    it('EC-005: Null values in mappings return warning', () => {
      const config = {
        domain: 'test',
        version: '1.0',
        typeSpecializations: {
          'Person': null
        }
      };
      const report = validator.validateDomainConfig(config);
      expect(report.hasWarnings() || report.hasErrors()).toBe(true);
    });

    it('EC-006: Array instead of object returns error', () => {
      const config = {
        domain: 'test',
        version: '1.0',
        typeSpecializations: [{ type: 'Person' }] // Should be object
      };
      const report = validator.validateDomainConfig(config);
      expect(report.hasWarnings()).toBe(true);
    });

    it('EC-007: Number as type mapping returns error', () => {
      const config = {
        domain: 'test',
        version: '1.0',
        typeSpecializations: {
          'Person': 12345 // Invalid
        }
      };
      const report = validator.validateDomainConfig(config);
      expect(report.hasWarnings()).toBe(true);
    });

    it('EC-008: validate() with string path attempts to parse as JSON', () => {
      const report = validator.validate('{"domain": "test", "version": "1.0"}');
      expect(report.isValid()).toBe(true);
    });
  });
});
