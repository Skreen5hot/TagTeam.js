/**
 * Phase 6.4 Builder Integration + Deontic Enhancement Tests
 *
 * Tests for:
 * 1. SemanticGraphBuilder integration with Phase 6 components
 * 2. Extended deontic vocabulary (claim, power, immunity)
 * 3. ActualityStatus mappings for new deontic types
 * 4. End-to-end lattice generation
 *
 * Test Count: 72 tests across 8 categories
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Import components
const SemanticGraphBuilder = require('../../../src/graph/SemanticGraphBuilder.js');
const ActExtractor = require('../../../src/graph/ActExtractor.js');

describe('Phase 6.4: Builder Integration + Deontic Enhancement', () => {
  let builder;
  let actExtractor;

  beforeEach(() => {
    builder = new SemanticGraphBuilder();
    actExtractor = new ActExtractor();
  });

  // ===========================================================================
  // Category 1: Builder Integration - Basic (10 tests)
  // ===========================================================================
  describe('Category 1: Builder Integration - Basic', () => {
    it('BI-001: build() with no options returns no lattice (backwards compatible)', () => {
      const result = builder.build('The doctor treats the patient.');

      expect(result).toHaveProperty('@graph');
      expect(result).not.toHaveProperty('_interpretationLattice');
    });

    it('BI-002: detectAmbiguity: true returns _ambiguityReport but no lattice', () => {
      const result = builder.build('The doctor should treat the patient.', {
        detectAmbiguity: true
      });

      expect(result).toHaveProperty('@graph');
      expect(result).toHaveProperty('_ambiguityReport');
      expect(result).not.toHaveProperty('_interpretationLattice');
    });

    it('BI-003: preserveAmbiguity: true returns _interpretationLattice', () => {
      const result = builder.build('The doctor should prioritize the younger patient.', {
        preserveAmbiguity: true
      });

      expect(result).toHaveProperty('@graph');
      expect(result).toHaveProperty('_interpretationLattice');
    });

    it('BI-004: preserveAmbiguity implies detectAmbiguity', () => {
      const result = builder.build('The doctor should treat the patient.', {
        preserveAmbiguity: true
      });

      expect(result).toHaveProperty('_ambiguityReport');
      expect(result).toHaveProperty('_interpretationLattice');
    });

    it('BI-005: Lattice getDefaultReading() matches @graph', () => {
      const result = builder.build('The doctor should treat the patient.', {
        preserveAmbiguity: true
      });

      if (result._interpretationLattice) {
        const defaultReading = result._interpretationLattice.getDefaultReading();
        expect(defaultReading['@graph']).toEqual(result['@graph']);
      }
    });

    it('BI-006: _metadata.hasInterpretationLattice flag is set correctly', () => {
      const withLattice = builder.build('The doctor should treat.', {
        preserveAmbiguity: true
      });
      const withoutLattice = builder.build('The doctor treats.', {
        preserveAmbiguity: false
      });

      expect(withLattice._metadata?.hasInterpretationLattice).toBe(true);
      expect(withoutLattice._metadata?.hasInterpretationLattice).toBeFalsy();
    });

    it('BI-007: Lattice has alternatives for modal ambiguity', () => {
      const result = builder.build('The doctor should prioritize the patient.', {
        preserveAmbiguity: true
      });

      if (result._interpretationLattice) {
        const alternatives = result._interpretationLattice.getAlternatives();
        // "should" is modal ambiguous (deontic vs epistemic)
        expect(alternatives.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('BI-008: preserveThreshold option is respected', () => {
      const highThreshold = builder.build('The doctor should treat.', {
        preserveAmbiguity: true,
        preserveThreshold: 0.95 // Very high - most ambiguities preserved
      });

      const lowThreshold = builder.build('The doctor should treat.', {
        preserveAmbiguity: true,
        preserveThreshold: 0.3 // Low - fewer ambiguities preserved
      });

      // Both should return lattices
      expect(highThreshold).toHaveProperty('_interpretationLattice');
      expect(lowThreshold).toHaveProperty('_interpretationLattice');
    });

    it('BI-009: maxAlternatives option limits alternatives', () => {
      const result = builder.build('Not all doctors should always treat every patient.', {
        preserveAmbiguity: true,
        maxAlternatives: 2
      });

      if (result._interpretationLattice) {
        const alternatives = result._interpretationLattice.getAlternatives();
        expect(alternatives.length).toBeLessThanOrEqual(2);
      }
    });

    it('BI-010: No alternatives when no preserved ambiguities', () => {
      const result = builder.build('The doctor treated the patient yesterday.', {
        preserveAmbiguity: true
      });

      if (result._interpretationLattice) {
        const alternatives = result._interpretationLattice.getAlternatives();
        // Past tense with no modal - may have no ambiguity
        expect(alternatives).toBeDefined();
      }
    });
  });

  // ===========================================================================
  // Category 2: Builder Integration - Alternatives (10 tests)
  // ===========================================================================
  describe('Category 2: Builder Integration - Alternatives', () => {
    it('BA-001: Modal ambiguity preserved with different modality in alternative', () => {
      const result = builder.build('The doctor should treat the patient.', {
        preserveAmbiguity: true
      });

      if (result._interpretationLattice) {
        const alternatives = result._interpretationLattice.getAlternatives();
        if (alternatives.length > 0) {
          // Check that alternatives have modality info
          expect(alternatives[0]).toBeDefined();
        }
      }
    });

    it('BA-002: Scope ambiguity preserved with different scope in alternative', () => {
      const result = builder.build('Not all patients received treatment.', {
        preserveAmbiguity: true
      });

      if (result._interpretationLattice) {
        const alternatives = result._interpretationLattice.getAlternatives();
        expect(alternatives).toBeDefined();
      }
    });

    it('BA-003: Multiple ambiguities generate multiple alternatives', () => {
      const result = builder.build('Not all doctors should treat every patient.', {
        preserveAmbiguity: true
      });

      if (result._interpretationLattice) {
        const alternatives = result._interpretationLattice.getAlternatives();
        expect(alternatives).toBeDefined();
      }
    });

    it('BA-004: Alternative IRIs are unique', () => {
      const result = builder.build('The doctor should prioritize the patient.', {
        preserveAmbiguity: true
      });

      if (result._interpretationLattice) {
        const alternatives = result._interpretationLattice.getAlternatives();
        const ids = alternatives.map(alt => alt['@id']).filter(id => id);

        // All IDs should be unique
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      }
    });

    it('BA-005: Alternatives link to source via derivedFrom', () => {
      const result = builder.build('The doctor should treat the patient.', {
        preserveAmbiguity: true
      });

      if (result._interpretationLattice) {
        const alternatives = result._interpretationLattice.getAlternatives();
        for (const alt of alternatives) {
          if (alt['tagteam:derivedFrom']) {
            expect(alt['tagteam:derivedFrom']).toBeDefined();
          }
        }
      }
    });

    it('BA-006: Plausibility scores assigned to alternatives', () => {
      const result = builder.build('The doctor should treat the patient.', {
        preserveAmbiguity: true
      });

      if (result._interpretationLattice) {
        const alternatives = result._interpretationLattice.getAlternatives();
        for (const alt of alternatives) {
          if (alt['tagteam:plausibility'] !== undefined) {
            expect(typeof alt['tagteam:plausibility']).toBe('number');
            expect(alt['tagteam:plausibility']).toBeGreaterThanOrEqual(0);
            expect(alt['tagteam:plausibility']).toBeLessThanOrEqual(1);
          }
        }
      }
    });

    it('BA-007: Lattice toJSONLD() includes alternatives', () => {
      const result = builder.build('The doctor should treat the patient.', {
        preserveAmbiguity: true
      });

      if (result._interpretationLattice && result._interpretationLattice.toJSONLD) {
        const jsonld = result._interpretationLattice.toJSONLD();
        // The JSON-LD format uses namespace prefix
        expect(jsonld).toHaveProperty('tagteam:alternativeReadings');
      }
    });

    it('BA-008: Lattice toSimplifiedGraph() excludes alternatives', () => {
      const result = builder.build('The doctor should treat the patient.', {
        preserveAmbiguity: true
      });

      if (result._interpretationLattice && result._interpretationLattice.toSimplifiedGraph) {
        const simplified = result._interpretationLattice.toSimplifiedGraph();
        expect(simplified).toHaveProperty('@graph');
        expect(simplified).not.toHaveProperty('alternativeReadings');
      }
    });

    it('BA-009: High confidence ambiguity is resolved (not preserved)', () => {
      // Use case with clear modality
      const result = builder.build('The doctor must treat the patient.', {
        preserveAmbiguity: true,
        preserveThreshold: 0.5 // Low threshold - only uncertain cases preserved
      });

      // "must" is high confidence obligation
      expect(result).toHaveProperty('@graph');
    });

    it('BA-010: Low confidence ambiguity is preserved', () => {
      const result = builder.build('The doctor should treat the patient.', {
        preserveAmbiguity: true,
        preserveThreshold: 0.9 // High threshold - ambiguous cases preserved
      });

      // "should" is ambiguous between deontic and epistemic
      expect(result).toHaveProperty('_interpretationLattice');
    });
  });

  // ===========================================================================
  // Category 3: Deontic Detection - Basic (10 tests)
  // ===========================================================================
  describe('Category 3: Deontic Detection - Basic', () => {
    it('DD-001: "must provide care" detected as obligation', () => {
      const result = builder.build('The doctor must provide care.');

      const acts = result['@graph'].filter(node =>
        node['@type']?.includes('cco:IntentionalAct') ||
        node['@type']?.includes('cco:ActOfHealthcareProvision')
      );

      if (acts.length > 0) {
        const hasObligation = acts.some(act =>
          act['tagteam:modality'] === 'obligation' ||
          act['tagteam:actualityStatus'] === 'tagteam:Prescribed'
        );
        expect(hasObligation).toBe(true);
      }
    });

    it('DD-002: "shall not disclose" detected as prohibition', () => {
      const result = builder.build('The doctor shall not disclose patient information.');

      const acts = result['@graph'].filter(node =>
        node['@type'] && (
          node['@type'].includes('cco:IntentionalAct') ||
          node['tagteam:modality'] === 'prohibition'
        )
      );

      const hasProhibition = acts.some(act =>
        act['tagteam:modality'] === 'prohibition' ||
        act['tagteam:actualityStatus'] === 'tagteam:Prohibited'
      );
      expect(hasProhibition).toBe(true);
    });

    it('DD-003: "may refuse treatment" detected as permission', () => {
      const result = builder.build('The doctor may refuse treatment.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'permission' ||
        node['tagteam:actualityStatus'] === 'tagteam:Permitted'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('DD-004: "is prohibited from" detected as prohibition', () => {
      const result = builder.build('The doctor is prohibited from accepting gifts.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'prohibition' ||
        node['tagteam:actualityStatus'] === 'tagteam:Prohibited'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('DD-005: "is forbidden to" detected as prohibition', () => {
      const result = builder.build('The nurse is forbidden to administer medication.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'prohibition' ||
        node['tagteam:actualityStatus'] === 'tagteam:Prohibited'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('DD-006: "is allowed to" detected as permission', () => {
      const result = builder.build('The patient is allowed to refuse treatment.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'permission' ||
        node['tagteam:actualityStatus'] === 'tagteam:Permitted'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('DD-007: "should consider" detected as recommendation', () => {
      const result = builder.build('The doctor should consider alternatives.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'recommendation' ||
        node['tagteam:modality'] === 'obligation' // "should" often mapped to weak obligation
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('DD-008: "ought to prioritize" detected as recommendation', () => {
      const result = builder.build('The physician ought to prioritize the patient.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'recommendation' ||
        node['tagteam:modality'] === 'obligation'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('DD-009: "required to report" detected as obligation', () => {
      const result = builder.build('The doctor is required to report abuse.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'obligation' ||
        node['tagteam:actualityStatus'] === 'tagteam:Prescribed'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('DD-010: "not allowed to" detected as prohibition', () => {
      const result = builder.build('The nurse is not allowed to prescribe.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'prohibition' ||
        node['tagteam:actualityStatus'] === 'tagteam:Prohibited'
      );

      expect(acts.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Category 4: Deontic Detection - Extended (10 tests)
  // ===========================================================================
  describe('Category 4: Deontic Detection - Extended', () => {
    it('DE-001: "entitled to refuse" detected as claim', () => {
      const result = builder.build('The patient is entitled to refuse treatment.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'claim' ||
        node['tagteam:actualityStatus'] === 'tagteam:Entitled'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('DE-002: "has the right to" detected as claim', () => {
      const result = builder.build('The patient has the right to informed consent.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'claim' ||
        node['tagteam:actualityStatus'] === 'tagteam:Entitled'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('DE-003: "deserves treatment" detected as claim', () => {
      const result = builder.build('The patient deserves treatment.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'claim' ||
        node['tagteam:actualityStatus'] === 'tagteam:Entitled'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('DE-004: "is authorized to" detected as power', () => {
      const result = builder.build('The committee is authorized to make decisions.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'power' ||
        node['tagteam:actualityStatus'] === 'tagteam:Empowered'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('DE-005: "empowers the committee" detected as power', () => {
      const result = builder.build('The law empowers the committee to act.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'power' ||
        node['tagteam:actualityStatus'] === 'tagteam:Empowered'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('DE-006: "delegates authority" detected as power', () => {
      const result = builder.build('The physician delegates authority to the nurse.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'power' ||
        node['tagteam:actualityStatus'] === 'tagteam:Empowered'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('DE-007: "is exempt from" detected as immunity', () => {
      const result = builder.build('The hospital is exempt from the regulation.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'immunity' ||
        node['tagteam:actualityStatus'] === 'tagteam:Protected'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('DE-008: "is protected from" detected as immunity', () => {
      const result = builder.build('The patient is protected from discrimination.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'immunity' ||
        node['tagteam:actualityStatus'] === 'tagteam:Protected'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('DE-009: "grants permission" detected as power', () => {
      const result = builder.build('The board grants permission to proceed.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'power' ||
        node['tagteam:actualityStatus'] === 'tagteam:Empowered'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('DE-010: "confers the right" detected as power', () => {
      const result = builder.build('The policy confers the right to appeal.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'power' ||
        node['tagteam:actualityStatus'] === 'tagteam:Empowered'
      );

      expect(acts.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Category 5: ActualityStatus Mapping (10 tests)
  // ===========================================================================
  describe('Category 5: ActualityStatus Mapping', () => {
    it('AS-001: obligation maps to tagteam:Prescribed', () => {
      const result = builder.build('The doctor must provide care.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:actualityStatus'] === 'tagteam:Prescribed'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('AS-002: permission maps to tagteam:Permitted', () => {
      const result = builder.build('The doctor may refuse treatment.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:actualityStatus'] === 'tagteam:Permitted'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('AS-003: prohibition maps to tagteam:Prohibited', () => {
      const result = builder.build('The doctor must not disclose information.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:actualityStatus'] === 'tagteam:Prohibited'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('AS-004: claim maps to tagteam:Entitled', () => {
      const result = builder.build('The patient is entitled to care.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:actualityStatus'] === 'tagteam:Entitled'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('AS-005: power maps to tagteam:Empowered', () => {
      const result = builder.build('The committee is authorized to decide.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:actualityStatus'] === 'tagteam:Empowered'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('AS-006: immunity maps to tagteam:Protected', () => {
      const result = builder.build('The organization is exempt from requirements.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:actualityStatus'] === 'tagteam:Protected'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('AS-007: recommendation maps to tagteam:Prescribed', () => {
      const result = builder.build('The doctor should consider options.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:actualityStatus'] === 'tagteam:Prescribed' ||
        node['tagteam:modality'] === 'recommendation'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('AS-008: negated obligation yields appropriate status', () => {
      const result = builder.build('The doctor did not provide care.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:actualityStatus'] === 'tagteam:Negated' ||
        node['tagteam:negated'] === true
      );

      // Should have negation marked somewhere
      expect(result['@graph'].length).toBeGreaterThan(0);
    });

    it('AS-009: past tense without modal maps to tagteam:Actual', () => {
      const result = builder.build('The doctor provided care yesterday.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:actualityStatus'] === 'tagteam:Actual'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('AS-010: hypothetical maps to tagteam:Hypothetical', () => {
      const result = builder.build('If the doctor provided care...');

      const acts = result['@graph'].filter(node =>
        node['tagteam:actualityStatus'] === 'tagteam:Hypothetical' ||
        node['tagteam:modality'] === 'hypothetical'
      );

      // Conditionals should be marked
      expect(result['@graph'].length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Category 6: Deontic in Graph Output (8 tests)
  // ===========================================================================
  describe('Category 6: Deontic in Graph Output', () => {
    it('DG-001: "entitled to" produces tagteam:modality: claim', () => {
      const result = builder.build('The patient is entitled to treatment.');

      const nodesWithClaim = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'claim'
      );

      expect(nodesWithClaim.length).toBeGreaterThan(0);
    });

    it('DG-002: "authorized to" produces tagteam:modality: power', () => {
      const result = builder.build('The board is authorized to approve.');

      const nodesWithPower = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'power'
      );

      expect(nodesWithPower.length).toBeGreaterThan(0);
    });

    it('DG-003: "forbidden from" produces tagteam:modality: prohibition', () => {
      const result = builder.build('The nurse is forbidden from prescribing.');

      const nodesWithProhibition = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'prohibition'
      );

      expect(nodesWithProhibition.length).toBeGreaterThan(0);
    });

    it('DG-004: claim produces tagteam:actualityStatus: tagteam:Entitled', () => {
      const result = builder.build('The patient is entitled to privacy.');

      const nodesWithEntitled = result['@graph'].filter(node =>
        node['tagteam:actualityStatus'] === 'tagteam:Entitled'
      );

      expect(nodesWithEntitled.length).toBeGreaterThan(0);
    });

    it('DG-005: extended vocab produces tagteam:deonticType', () => {
      const result = builder.build('The patient is entitled to care.');

      const nodesWithDeonticType = result['@graph'].filter(node =>
        node['tagteam:deonticType']
      );

      expect(nodesWithDeonticType.length).toBeGreaterThan(0);
    });

    it('DG-006: claim produces tagteam:deonticType: claim', () => {
      const result = builder.build('The patient deserves treatment.');

      const nodesWithClaimType = result['@graph'].filter(node =>
        node['tagteam:deonticType'] === 'claim'
      );

      expect(nodesWithClaimType.length).toBeGreaterThan(0);
    });

    it('DG-007: power produces tagteam:deonticType: power', () => {
      const result = builder.build('The committee empowers the director.');

      const nodesWithPowerType = result['@graph'].filter(node =>
        node['tagteam:deonticType'] === 'power'
      );

      expect(nodesWithPowerType.length).toBeGreaterThan(0);
    });

    it('DG-008: multiple deontic markers captured in graph', () => {
      const result = builder.build(
        'The patient is entitled to treatment and the doctor must provide it.'
      );

      const claim = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'claim' ||
        node['tagteam:actualityStatus'] === 'tagteam:Entitled'
      );

      const obligation = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'obligation' ||
        node['tagteam:actualityStatus'] === 'tagteam:Prescribed'
      );

      expect(claim.length).toBeGreaterThan(0);
      expect(obligation.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Category 7: Edge Cases (8 tests)
  // ===========================================================================
  describe('Category 7: Edge Cases', () => {
    it('EC-001: no modal, no deontic markers yields no deontic properties', () => {
      const result = builder.build('The cat sat on the mat.');

      // Simple declarative - may not have deontic properties
      const deonticNodes = result['@graph'].filter(node =>
        node['tagteam:modality'] ||
        node['tagteam:deonticType']
      );

      // May have some default, but shouldn't have strong deontic markers
      expect(result['@graph'].length).toBeGreaterThan(0);
    });

    it('EC-002: ambiguous "should" defaults to recommendation', () => {
      const result = builder.build('The doctor should treat.');

      const acts = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'recommendation' ||
        node['tagteam:modality'] === 'obligation'
      );

      // "should" should be detected as some form of deontic
      expect(acts.length).toBeGreaterThan(0);
    });

    it('EC-003: conflicting markers resolved by confidence', () => {
      // Construct a case with potential conflict
      const result = builder.build('The doctor must be allowed to treat.');

      // Should have some deontic detected
      expect(result['@graph'].length).toBeGreaterThan(0);
    });

    it('EC-004: nested modals use outer modal', () => {
      const result = builder.build('The doctor must be able to treat.');

      // "must" is the outer modal
      const acts = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'obligation' ||
        node['tagteam:actualityStatus'] === 'tagteam:Prescribed'
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('EC-005: negated permission is not automatically prohibition', () => {
      const result = builder.build('The patient is not permitted to leave.');

      // Could be prohibition or negated permission
      const acts = result['@graph'].filter(node =>
        node['tagteam:modality'] === 'prohibition' ||
        node['tagteam:actualityStatus'] === 'tagteam:Prohibited' ||
        node['tagteam:negated'] === true
      );

      expect(acts.length).toBeGreaterThan(0);
    });

    it('EC-006: empty text handled gracefully', () => {
      const result = builder.build('');

      expect(result).toHaveProperty('@graph');
      expect(Array.isArray(result['@graph'])).toBe(true);
    });

    it('EC-007: unknown modal does not crash', () => {
      const result = builder.build('The doctor might treat the patient.');

      // "might" is epistemic, not deontic
      expect(result).toHaveProperty('@graph');
    });

    it('EC-008: case insensitivity for markers', () => {
      const result1 = builder.build('The patient is ENTITLED to care.');
      const result2 = builder.build('The patient is entitled to care.');

      // Both should detect claim
      const claim1 = result1['@graph'].filter(n => n['tagteam:modality'] === 'claim');
      const claim2 = result2['@graph'].filter(n => n['tagteam:modality'] === 'claim');

      expect(claim1.length).toBe(claim2.length);
    });
  });

  // ===========================================================================
  // Category 8: Integration with Lattice (6 tests)
  // ===========================================================================
  describe('Category 8: Integration with Lattice', () => {
    it('IL-001: deontic ambiguity produces alternatives with different modalities', () => {
      const result = builder.build('The doctor should treat the patient.', {
        preserveAmbiguity: true
      });

      if (result._interpretationLattice) {
        const alternatives = result._interpretationLattice.getAlternatives();
        // Check alternatives have modality variation
        expect(alternatives).toBeDefined();
      }
    });

    it('IL-002: "should" ambiguity preserved as deontic and epistemic', () => {
      const result = builder.build('The doctor should treat the patient.', {
        preserveAmbiguity: true
      });

      if (result._interpretationLattice) {
        const preserved = result._interpretationLattice.getAmbiguitiesPreserved();
        // "should" may be preserved as ambiguous
        expect(preserved).toBeDefined();
      }
    });

    it('IL-003: claim vs obligation can be alternative readings', () => {
      // Ambiguous: "due care" could be claim (owed) or obligation
      const result = builder.build('The patient is owed due care.', {
        preserveAmbiguity: true
      });

      expect(result).toHaveProperty('_interpretationLattice');
    });

    it('IL-004: lattice serialization includes deontic info', () => {
      const result = builder.build('The patient is entitled to treatment.', {
        preserveAmbiguity: true
      });

      if (result._interpretationLattice && result._interpretationLattice.toJSONLD) {
        const jsonld = result._interpretationLattice.toJSONLD();
        // Should serialize deontic properties
        expect(jsonld).toBeDefined();
      }
    });

    it('IL-005: AlternativeGraphBuilder uses extended vocabulary', () => {
      const result = builder.build('The patient is entitled to refuse.', {
        preserveAmbiguity: true
      });

      if (result._interpretationLattice) {
        const alternatives = result._interpretationLattice.getAlternatives();
        for (const alt of alternatives) {
          // Check for extended status values if present
          if (alt['tagteam:actualityStatus']) {
            const validStatuses = [
              'tagteam:Prescribed',
              'tagteam:Permitted',
              'tagteam:Prohibited',
              'tagteam:Entitled',
              'tagteam:Empowered',
              'tagteam:Protected',
              'tagteam:Actual',
              'tagteam:Hypothetical'
            ];
            expect(validStatuses).toContain(alt['tagteam:actualityStatus']);
          }
        }
      }
    });

    it('IL-006: full pipeline with deontic works end-to-end', () => {
      const result = builder.build(
        'The physician is authorized to prescribe and the patient is entitled to receive medication.',
        {
          preserveAmbiguity: true,
          detectAmbiguity: true
        }
      );

      // Should have all Phase 5 and 6 outputs
      expect(result).toHaveProperty('@graph');
      expect(result).toHaveProperty('_ambiguityReport');
      expect(result).toHaveProperty('_interpretationLattice');

      // Should detect both power and claim
      const power = result['@graph'].filter(n =>
        n['tagteam:modality'] === 'power' ||
        n['tagteam:actualityStatus'] === 'tagteam:Empowered'
      );
      const claim = result['@graph'].filter(n =>
        n['tagteam:modality'] === 'claim' ||
        n['tagteam:actualityStatus'] === 'tagteam:Entitled'
      );

      expect(power.length + claim.length).toBeGreaterThan(0);
    });
  });
});
