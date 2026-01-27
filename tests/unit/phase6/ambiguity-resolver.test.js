/**
 * @file tests/unit/phase6/ambiguity-resolver.test.js
 * @description Unit tests for AmbiguityResolver (Phase 6.1)
 *
 * Test Categories:
 * - Basic Resolution (BR): Core resolution logic for each ambiguity type
 * - Threshold Configuration (TC): Custom threshold and config tests
 * - Context-Dependent Resolution (CD): Context signals affecting resolution
 * - Full Report Resolution (FR): Processing complete AmbiguityReports
 * - Edge Cases (EC): Boundary conditions and error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
const AmbiguityResolver = require('../../../src/graph/AmbiguityResolver.js');

describe('AmbiguityResolver', () => {
  let resolver;

  beforeEach(() => {
    resolver = new AmbiguityResolver();
  });

  // ============================================
  // Category 1: Basic Resolution (BR) - 10 tests
  // ============================================
  describe('Basic Resolution', () => {

    // BR-001: selectional_violation always flagged
    it('BR-001: should flag selectional_violation (never preserve)', () => {
      const ambiguity = {
        type: 'selectional_violation',
        node: 'rock',
        verb: 'decide',
        confidence: 0.9
      };

      const result = resolver.shouldPreserve(ambiguity);

      expect(result.preserve).toBe(false);
      expect(result.flag).toBe('selectionalMismatch');
      expect(result.reason).toContain('Anomalous');
    });

    // BR-002: potential_metonymy always flagged
    it('BR-002: should flag potential_metonymy (annotate only)', () => {
      const ambiguity = {
        type: 'potential_metonymy',
        node: 'The White House',
        confidence: 0.8
      };

      const result = resolver.shouldPreserve(ambiguity);

      expect(result.preserve).toBe(false);
      expect(result.flag).toBe('potentialMetonymy');
      expect(result.reason).toContain('Metonymic');
    });

    // BR-003: modal_force preserved when confidence below threshold
    it('BR-003: should preserve modal_force when confidence below threshold', () => {
      const ambiguity = {
        type: 'modal_force',
        node: 'must',
        readings: ['obligation', 'expectation'],
        confidence: 0.5
      };

      const result = resolver.shouldPreserve(ambiguity);

      expect(result.preserve).toBe(true);
      expect(result.reason).toContain('below');
    });

    // BR-004: modal_force resolved when confidence above threshold
    it('BR-004: should resolve modal_force when confidence above threshold', () => {
      const ambiguity = {
        type: 'modal_force',
        node: 'must',
        readings: ['obligation', 'expectation'],
        confidence: 0.9
      };

      const result = resolver.shouldPreserve(ambiguity);

      expect(result.preserve).toBe(false);
      expect(result.selectedReading).toBeDefined();
      expect(result.reason).toContain('high confidence');
    });

    // BR-005: scope always preserved (semantically significant)
    it('BR-005: should always preserve scope ambiguity', () => {
      const ambiguity = {
        type: 'scope',
        node: 'every patient',
        readings: ['wide', 'narrow'],
        confidence: 0.95
      };

      const result = resolver.shouldPreserve(ambiguity);

      expect(result.preserve).toBe(true);
      expect(result.reason).toContain('semantically significant');
    });

    // BR-006: noun_category preserved with of_complement signal
    it('BR-006: should preserve noun_category with of_complement signal', () => {
      const ambiguity = {
        type: 'noun_category',
        node: 'destruction',
        signals: ['of_complement'],
        readings: ['process', 'continuant']
      };

      const result = resolver.shouldPreserve(ambiguity);

      expect(result.preserve).toBe(true);
    });

    // BR-007: noun_category resolved when agent of intentional act
    it('BR-007: should resolve noun_category to continuant when agent signal present', () => {
      const ambiguity = {
        type: 'noun_category',
        node: 'surgeon',
        signals: ['subject_of_intentional_act'],
        readings: ['continuant', 'role']
      };

      const result = resolver.shouldPreserve(ambiguity);

      expect(result.preserve).toBe(false);
      expect(result.selectedReading).toBe('continuant');
    });

    // BR-008: verb_sense preserved when confidence below threshold
    it('BR-008: should preserve verb_sense when confidence below 0.6', () => {
      const ambiguity = {
        type: 'verb_sense',
        node: 'run',
        readings: ['locomotion', 'operate'],
        confidence: 0.4
      };

      const result = resolver.shouldPreserve(ambiguity);

      expect(result.preserve).toBe(true);
    });

    // BR-009: verb_sense resolved when confidence above threshold
    it('BR-009: should resolve verb_sense when confidence above 0.6', () => {
      const ambiguity = {
        type: 'verb_sense',
        node: 'run',
        readings: ['locomotion', 'operate'],
        confidence: 0.8
      };

      const result = resolver.shouldPreserve(ambiguity);

      expect(result.preserve).toBe(false);
      expect(result.selectedReading).toBeDefined();
    });

    // BR-010: Empty report returns empty result
    it('BR-010: should return empty result for empty report', () => {
      const report = {
        ambiguities: [],
        hasAmbiguity: () => false,
        getAmbiguities: () => []
      };

      const result = resolver.resolve(report);

      expect(result.preserved).toHaveLength(0);
      expect(result.resolved).toHaveLength(0);
      expect(result.flagged).toHaveLength(0);
      expect(result.stats.total).toBe(0);
    });
  });

  // ============================================
  // Category 2: Threshold Configuration (TC) - 8 tests
  // ============================================
  describe('Threshold Configuration', () => {

    // TC-001: Custom low threshold causes resolution
    it('TC-001: should resolve when confidence above custom low threshold', () => {
      const customResolver = new AmbiguityResolver({
        preserveThreshold: 0.5
      });

      const ambiguity = {
        type: 'modal_force',
        confidence: 0.6,
        readings: ['obligation', 'expectation']
      };

      const result = customResolver.shouldPreserve(ambiguity);

      expect(result.preserve).toBe(false);
    });

    // TC-002: Custom low threshold causes preservation when below
    it('TC-002: should preserve when confidence below custom threshold', () => {
      const customResolver = new AmbiguityResolver({
        preserveThreshold: 0.5
      });

      const ambiguity = {
        type: 'modal_force',
        confidence: 0.4,
        readings: ['obligation', 'expectation']
      };

      const result = customResolver.shouldPreserve(ambiguity);

      expect(result.preserve).toBe(true);
    });

    // TC-003: High threshold preserves more
    it('TC-003: should preserve with high threshold (0.9)', () => {
      const customResolver = new AmbiguityResolver({
        preserveThreshold: 0.9
      });

      const ambiguity = {
        type: 'modal_force',
        confidence: 0.8,
        readings: ['obligation', 'expectation']
      };

      const result = customResolver.shouldPreserve(ambiguity);

      expect(result.preserve).toBe(true);
    });

    // TC-004: maxReadingsPerNode caps readings
    it('TC-004: should cap readings per node to maxReadingsPerNode', () => {
      const customResolver = new AmbiguityResolver({
        maxReadingsPerNode: 2
      });

      const ambiguity = {
        type: 'scope',
        readings: ['reading1', 'reading2', 'reading3', 'reading4']
      };

      const result = customResolver.shouldPreserve(ambiguity);

      expect(result.readings.length).toBeLessThanOrEqual(2);
    });

    // TC-005: maxTotalAlternatives caps preserved ambiguities
    it('TC-005: should respect maxTotalAlternatives cap', () => {
      const customResolver = new AmbiguityResolver({
        maxTotalAlternatives: 5,
        preserveThreshold: 0.99 // preserve almost everything
      });

      const report = {
        ambiguities: Array(10).fill(null).map((_, i) => ({
          type: 'scope',
          id: `scope-${i}`,
          readings: ['wide', 'narrow'],
          confidence: 0.5
        })),
        hasAmbiguity: () => true,
        getAmbiguities: function() { return this.ambiguities; }
      };

      const result = customResolver.resolve(report);

      expect(result.preserved.length).toBeLessThanOrEqual(5);
    });

    // TC-006: Default threshold is 0.7
    it('TC-006: should have default preserveThreshold of 0.7', () => {
      expect(resolver.config.preserveThreshold).toBe(0.7);
    });

    // TC-007: Custom rule override
    it('TC-007: should allow custom rule override via setRule', () => {
      resolver.setRule('custom_type', {
        action: 'flag',
        flag: 'customFlag',
        reason: 'Custom rule applied'
      });

      const ambiguity = { type: 'custom_type' };
      const result = resolver.shouldPreserve(ambiguity);

      expect(result.preserve).toBe(false);
      expect(result.flag).toBe('customFlag');
    });

    // TC-008: Null config uses defaults
    it('TC-008: should use defaults with null/undefined config', () => {
      const defaultResolver = new AmbiguityResolver(null);

      expect(defaultResolver.config.preserveThreshold).toBe(0.7);
      expect(defaultResolver.config.maxReadingsPerNode).toBe(3);
    });
  });

  // ============================================
  // Category 3: Context-Dependent Resolution (CD) - 10 tests
  // ============================================
  describe('Context-Dependent Resolution', () => {

    // CD-001: noun_category with of_complement preserved
    it('CD-001: should preserve noun_category with of complement', () => {
      const ambiguity = {
        type: 'noun_category',
        node: 'destruction',
        signals: ['of_complement'],
        readings: ['process', 'continuant']
      };

      const result = resolver.shouldPreserve(ambiguity);

      expect(result.preserve).toBe(true);
    });

    // CD-002: noun_category resolved to continuant when agent of act
    it('CD-002: should resolve noun_category to continuant for agent of act', () => {
      const ambiguity = {
        type: 'noun_category',
        node: 'surgeon',
        signals: ['subject_of_intentional_act'],
        readings: ['continuant', 'role']
      };

      const result = resolver.shouldPreserve(ambiguity);

      expect(result.preserve).toBe(false);
      expect(result.selectedReading).toBe('continuant');
    });

    // CD-003: noun_category resolved to process with duration predicate
    it('CD-003: should resolve noun_category to process with duration predicate', () => {
      const ambiguity = {
        type: 'noun_category',
        node: 'treatment',
        signals: ['duration_predicate'],
        readings: ['process', 'continuant']
      };

      const result = resolver.shouldPreserve(ambiguity);

      expect(result.preserve).toBe(false);
      expect(result.selectedReading).toBe('process');
    });

    // CD-004: modal_force with perfect aspect resolves to epistemic
    it('CD-004: should resolve modal_force to epistemic with perfect aspect', () => {
      const ambiguity = {
        type: 'modal_force',
        node: 'must',
        signals: ['perfect_aspect'],
        readings: ['epistemic', 'deontic'],
        confidence: 0.5
      };

      const result = resolver.shouldPreserve(ambiguity);

      expect(result.preserve).toBe(false);
      expect(result.selectedReading).toBe('epistemic');
    });

    // CD-005: modal_force with agent subject resolves to deontic
    it('CD-005: should resolve modal_force to deontic with agent subject', () => {
      const ambiguity = {
        type: 'modal_force',
        node: 'must',
        signals: ['agent_subject'],
        readings: ['deontic', 'epistemic'],
        confidence: 0.5
      };

      const result = resolver.shouldPreserve(ambiguity);

      expect(result.preserve).toBe(false);
      expect(result.selectedReading).toBe('deontic');
    });

    // CD-006: modal_force with stative verb leans epistemic
    it('CD-006: should lean epistemic for modal_force with stative verb', () => {
      const ambiguity = {
        type: 'modal_force',
        node: 'must',
        signals: ['stative_verb'],
        readings: ['epistemic', 'deontic'],
        confidence: 0.5
      };

      const result = resolver.shouldPreserve(ambiguity);

      // With stative_verb signal, should resolve to epistemic
      expect(result.selectedReading).toBe('epistemic');
    });

    // CD-007: scope with not_all pattern defaults to wide
    it('CD-007: should default to wide scope for not_all pattern', () => {
      const ambiguity = {
        type: 'scope',
        node: 'not all patients',
        signals: ['not_all'],
        readings: ['wide', 'narrow']
      };

      const result = resolver.shouldPreserve(ambiguity);

      expect(result.preserve).toBe(true);
      expect(result.defaultReading).toBe('wide');
    });

    // CD-008: scope with multiple quantifiers preserved
    it('CD-008: should preserve scope with multiple quantifiers', () => {
      const ambiguity = {
        type: 'scope',
        node: 'every doctor some patient',
        signals: ['multiple_quantifiers'],
        readings: ['subject_wide', 'object_wide']
      };

      const result = resolver.shouldPreserve(ambiguity);

      expect(result.preserve).toBe(true);
    });

    // CD-009: Organization agent not a violation
    it('CD-009: should not flag organization as selectional violation', () => {
      // This tests that organization subjects are valid for mental verbs
      const ambiguity = {
        type: 'selectional_check',
        node: 'committee',
        entityType: 'organization',
        verb: 'decide'
      };

      // Organizations are valid for intentional_mental verbs
      // This should not create a violation
      const result = resolver.shouldPreserve(ambiguity);

      // Unknown type defaults to preserve
      expect(result.flag).toBeUndefined();
    });

    // CD-010: Inanimate agent flagged as violation
    it('CD-010: should flag inanimate agent as selectional violation', () => {
      const ambiguity = {
        type: 'selectional_violation',
        node: 'rock',
        entityType: 'inanimate',
        verb: 'decide',
        confidence: 0.9
      };

      const result = resolver.shouldPreserve(ambiguity);

      expect(result.preserve).toBe(false);
      expect(result.flag).toBe('selectionalMismatch');
    });
  });

  // ============================================
  // Category 4: Full Report Resolution (FR) - 7 tests
  // ============================================
  describe('Full Report Resolution', () => {

    // FR-001: Single low confidence modal_force preserved
    it('FR-001: should preserve single low confidence modal_force', () => {
      const report = {
        ambiguities: [{
          type: 'modal_force',
          node: 'must',
          readings: ['obligation', 'expectation'],
          confidence: 0.5
        }],
        hasAmbiguity: () => true,
        getAmbiguities: function() { return this.ambiguities; }
      };

      const result = resolver.resolve(report);

      expect(result.preserved).toHaveLength(1);
      expect(result.stats.preserved).toBe(1);
    });

    // FR-002: Single selectional_violation flagged
    it('FR-002: should flag single selectional_violation', () => {
      const report = {
        ambiguities: [{
          type: 'selectional_violation',
          node: 'rock',
          verb: 'decide',
          confidence: 0.9
        }],
        hasAmbiguity: () => true,
        getAmbiguities: function() { return this.ambiguities; }
      };

      const result = resolver.resolve(report);

      expect(result.flagged).toHaveLength(1);
      expect(result.stats.flagged).toBe(1);
    });

    // FR-003: Mixed report with correct categorization
    it('FR-003: should correctly categorize mixed report', () => {
      const report = {
        ambiguities: [
          { type: 'modal_force', confidence: 0.5, readings: ['a', 'b'] },
          { type: 'modal_force', confidence: 0.4, readings: ['c', 'd'] },
          { type: 'scope', readings: ['wide', 'narrow'] },
          { type: 'selectional_violation', confidence: 0.9 }
        ],
        hasAmbiguity: () => true,
        getAmbiguities: function() { return this.ambiguities; }
      };

      const result = resolver.resolve(report);

      expect(result.preserved.length).toBe(3); // 2 modal + 1 scope
      expect(result.flagged.length).toBe(1);   // 1 violation
      expect(result.stats.total).toBe(4);
    });

    // FR-004: Multiple scope ambiguities all preserved
    it('FR-004: should preserve all scope ambiguities', () => {
      const report = {
        ambiguities: Array(5).fill(null).map((_, i) => ({
          type: 'scope',
          id: `scope-${i}`,
          readings: ['wide', 'narrow'],
          confidence: 0.9
        })),
        hasAmbiguity: () => true,
        getAmbiguities: function() { return this.ambiguities; }
      };

      const result = resolver.resolve(report);

      expect(result.preserved.length).toBe(5);
    });

    // FR-005: All high confidence resolved
    it('FR-005: should resolve all high confidence ambiguities', () => {
      const report = {
        ambiguities: [
          { type: 'modal_force', confidence: 0.95, readings: ['obligation'] },
          { type: 'verb_sense', confidence: 0.9, readings: ['sense1'] }
        ],
        hasAmbiguity: () => true,
        getAmbiguities: function() { return this.ambiguities; }
      };

      const result = resolver.resolve(report);

      expect(result.resolved.length).toBe(2);
      expect(result.preserved.length).toBe(0);
    });

    // FR-006: Respects maxTotalAlternatives cap
    it('FR-006: should respect maxTotalAlternatives in full report', () => {
      const customResolver = new AmbiguityResolver({
        maxTotalAlternatives: 3
      });

      const report = {
        ambiguities: Array(10).fill(null).map((_, i) => ({
          type: 'scope',
          id: `scope-${i}`,
          readings: ['wide', 'narrow']
        })),
        hasAmbiguity: () => true,
        getAmbiguities: function() { return this.ambiguities; }
      };

      const result = customResolver.resolve(report);

      expect(result.preserved.length).toBeLessThanOrEqual(3);
    });

    // FR-007: Empty report returns zero stats
    it('FR-007: should return zero stats for empty report', () => {
      const report = {
        ambiguities: [],
        hasAmbiguity: () => false,
        getAmbiguities: () => []
      };

      const result = resolver.resolve(report);

      expect(result.stats.total).toBe(0);
      expect(result.stats.preserved).toBe(0);
      expect(result.stats.resolved).toBe(0);
      expect(result.stats.flagged).toBe(0);
    });
  });

  // ============================================
  // Category 5: Edge Cases (EC) - 5 tests
  // ============================================
  describe('Edge Cases', () => {

    // EC-001: Unknown ambiguity type treated as preserve
    it('EC-001: should preserve unknown ambiguity type', () => {
      const ambiguity = {
        type: 'unknown_type',
        readings: ['option1', 'option2'],
        confidence: 0.5
      };

      const result = resolver.shouldPreserve(ambiguity);

      expect(result.preserve).toBe(true);
      expect(result.reason).toContain('Unknown');
    });

    // EC-002: Null ambiguity skipped
    it('EC-002: should skip null ambiguity', () => {
      const report = {
        ambiguities: [null, undefined, { type: 'scope', readings: ['a', 'b'] }],
        hasAmbiguity: () => true,
        getAmbiguities: function() { return this.ambiguities; }
      };

      const result = resolver.resolve(report);

      expect(result.stats.total).toBe(1); // Only valid ambiguity counted
    });

    // EC-003: Missing confidence uses default
    it('EC-003: should use default confidence (0.5) when missing', () => {
      const ambiguity = {
        type: 'modal_force',
        readings: ['obligation', 'expectation']
        // confidence missing
      };

      const result = resolver.shouldPreserve(ambiguity);

      // With default 0.5 confidence and 0.7 threshold, should preserve
      expect(result.preserve).toBe(true);
    });

    // EC-004: Missing signals treated as empty array
    it('EC-004: should treat missing signals as empty array', () => {
      const ambiguity = {
        type: 'noun_category',
        readings: ['process', 'continuant']
        // signals missing
      };

      const result = resolver.shouldPreserve(ambiguity);

      // No signals means preserve by default for noun_category
      expect(result.preserve).toBe(true);
    });

    // EC-005: First matching signal wins on conflict
    it('EC-005: should use first matching signal when conflicts exist', () => {
      const ambiguity = {
        type: 'noun_category',
        signals: ['subject_of_intentional_act', 'of_complement'], // Both present
        readings: ['continuant', 'process']
      };

      const result = resolver.shouldPreserve(ambiguity);

      // First signal (subject_of_intentional_act) should win
      expect(result.preserve).toBe(false);
      expect(result.selectedReading).toBe('continuant');
    });
  });

  // ============================================
  // API Tests
  // ============================================
  describe('API', () => {

    it('should have resolve method', () => {
      expect(typeof resolver.resolve).toBe('function');
    });

    it('should have shouldPreserve method', () => {
      expect(typeof resolver.shouldPreserve).toBe('function');
    });

    it('should have getRule method', () => {
      expect(typeof resolver.getRule).toBe('function');
    });

    it('should have setRule method', () => {
      expect(typeof resolver.setRule).toBe('function');
    });

    it('getRule should return rule for known type', () => {
      const rule = resolver.getRule('selectional_violation');

      expect(rule).toBeDefined();
      expect(rule.action).toBe('flag');
    });

    it('getRule should return undefined for unknown type', () => {
      const rule = resolver.getRule('nonexistent_type');

      expect(rule).toBeUndefined();
    });
  });
});
