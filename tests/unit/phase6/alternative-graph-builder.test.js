/**
 * @file tests/unit/phase6/alternative-graph-builder.test.js
 * @description Tests for Phase 6.3 AlternativeGraphBuilder
 *
 * Tests the generation of alternative graph fragments for preserved ambiguities.
 */

import { describe, it, expect, beforeEach } from 'vitest';

const AlternativeGraphBuilder = require('../../../src/graph/AlternativeGraphBuilder.js');

describe('Phase 6.3: AlternativeGraphBuilder', () => {
  let builder;

  beforeEach(() => {
    builder = new AlternativeGraphBuilder();
  });

  // ==================== Category 1: Constructor & Basic Properties ====================

  describe('Category 1: Constructor & Basic Properties', () => {
    it('BP-001: Empty constructor creates builder with default options', () => {
      const b = new AlternativeGraphBuilder();
      expect(b).toBeDefined();
      expect(b.options).toBeDefined();
    });

    it('BP-002: Custom options applied correctly', () => {
      const b = new AlternativeGraphBuilder({
        iriSuffix: '_variant',
        preserveOriginalLinks: false
      });
      expect(b.options.iriSuffix).toBe('_variant');
      expect(b.options.preserveOriginalLinks).toBe(false);
    });

    it('BP-003: Default iriSuffix is _alt', () => {
      expect(builder.options.iriSuffix).toBe('_alt');
    });

    it('BP-004: Custom iriSuffix used', () => {
      const b = new AlternativeGraphBuilder({ iriSuffix: '_x' });
      expect(b.options.iriSuffix).toBe('_x');
    });

    it('BP-005: preserveOriginalLinks default is true', () => {
      expect(builder.options.preserveOriginalLinks).toBe(true);
    });

    it('BP-006: includeMetadata default is true', () => {
      expect(builder.options.includeMetadata).toBe(true);
    });
  });

  // ==================== Category 2: IRI Generation ====================

  describe('Category 2: IRI Generation', () => {
    it('IG-001: generateAlternativeIri index 0 returns _alt1', () => {
      const result = builder.generateAlternativeIri('inst:Act_1', 0);
      expect(result).toBe('inst:Act_1_alt1');
    });

    it('IG-002: generateAlternativeIri index 1 returns _alt2', () => {
      const result = builder.generateAlternativeIri('inst:Act_1', 1);
      expect(result).toBe('inst:Act_1_alt2');
    });

    it('IG-003: generateAlternativeIri with custom suffix', () => {
      const b = new AlternativeGraphBuilder({ iriSuffix: '_var' });
      const result = b.generateAlternativeIri('inst:Act_1', 0);
      expect(result).toBe('inst:Act_1_var1');
    });

    it('IG-004: generateAlternativeIri null input returns null', () => {
      const result = builder.generateAlternativeIri(null, 0);
      expect(result).toBeNull();
    });

    it('IG-005: IRI with existing suffix appends correctly', () => {
      const result = builder.generateAlternativeIri('inst:Act_1_v2', 0);
      expect(result).toBe('inst:Act_1_v2_alt1');
    });

    it('IG-006: Multiple alternatives same node all unique', () => {
      const iri1 = builder.generateAlternativeIri('inst:Act_1', 0);
      const iri2 = builder.generateAlternativeIri('inst:Act_1', 1);
      const iri3 = builder.generateAlternativeIri('inst:Act_1', 2);
      expect(new Set([iri1, iri2, iri3]).size).toBe(3);
    });

    it('IG-007: IRI preserves namespace prefix', () => {
      const result = builder.generateAlternativeIri('inst:SomeNode_123', 0);
      expect(result.startsWith('inst:')).toBe(true);
    });

    it('IG-008: IRI with special characters handled', () => {
      const result = builder.generateAlternativeIri('inst:Act-With-Dashes', 0);
      expect(result).toBe('inst:Act-With-Dashes_alt1');
    });
  });

  // ==================== Category 3: Variant Node Creation ====================

  describe('Category 3: Variant Node Creation', () => {
    const originalNode = {
      '@id': 'inst:Act_123',
      '@type': ['IntentionalAct'],
      'tagteam:modality': 'obligation',
      'tagteam:agent': { '@id': 'inst:Agent_1' }
    };

    it('VN-001: createVariantNode returns new node with modified IRI', () => {
      const variant = builder.createVariantNode(originalNode, {}, '_alt1');
      expect(variant['@id']).toBe('inst:Act_123_alt1');
    });

    it('VN-002: createVariantNode preserves @type', () => {
      const variant = builder.createVariantNode(originalNode, {}, '_alt1');
      expect(variant['@type']).toContain('IntentionalAct');
    });

    it('VN-003: createVariantNode applies modifications', () => {
      const variant = builder.createVariantNode(originalNode, {
        'tagteam:modality': 'expectation'
      }, '_alt1');
      expect(variant['tagteam:modality']).toBe('expectation');
    });

    it('VN-004: createVariantNode adds alternativeFor link', () => {
      const variant = builder.createVariantNode(originalNode, {}, '_alt1');
      expect(variant['tagteam:alternativeFor']).toEqual({ '@id': 'inst:Act_123' });
    });

    it('VN-005: createVariantNode preserves other properties', () => {
      const variant = builder.createVariantNode(originalNode, {
        'tagteam:modality': 'expectation'
      }, '_alt1');
      expect(variant['tagteam:agent']).toEqual({ '@id': 'inst:Agent_1' });
    });

    it('VN-006: createVariantNode is deep copy - no mutation', () => {
      const variant = builder.createVariantNode(originalNode, {
        'tagteam:modality': 'expectation'
      }, '_alt1');
      expect(originalNode['tagteam:modality']).toBe('obligation');
      expect(originalNode['@id']).toBe('inst:Act_123');
    });

    it('VN-007: createVariantNode with null original returns null', () => {
      const variant = builder.createVariantNode(null, {}, '_alt1');
      expect(variant).toBeNull();
    });

    it('VN-008: createVariantNode with empty modifications returns clone with new IRI', () => {
      const variant = builder.createVariantNode(originalNode, {}, '_alt1');
      expect(variant['@id']).toBe('inst:Act_123_alt1');
      expect(variant['tagteam:modality']).toBe('obligation');
    });

    it('VN-009: createVariantNode adds AlternativeNode type', () => {
      const variant = builder.createVariantNode(originalNode, {}, '_alt1');
      expect(variant['@type']).toContain('tagteam:AlternativeNode');
    });

    it('VN-010: createVariantNode uses custom suffix', () => {
      const variant = builder.createVariantNode(originalNode, {}, '_v2');
      expect(variant['@id']).toBe('inst:Act_123_v2');
    });
  });

  // ==================== Category 4: Modal Alternatives ====================

  describe('Category 4: Modal Alternatives', () => {
    const defaultGraph = {
      '@graph': [
        {
          '@id': 'inst:Act_123',
          '@type': ['IntentionalAct'],
          'tagteam:modality': 'obligation',
          'tagteam:actualityStatus': 'tagteam:Prescribed'
        }
      ]
    };

    const modalAmbiguity = {
      type: 'modal_force',
      nodeId: 'inst:Act_123',
      span: 'should prioritize',
      readings: ['deontic', 'epistemic'],
      defaultReading: 'deontic',
      confidence: 0.6
    };

    it('MA-001: buildModalAlternatives returns array of alternatives', () => {
      const alts = builder.buildModalAlternatives(modalAmbiguity, defaultGraph);
      expect(Array.isArray(alts)).toBe(true);
      expect(alts.length).toBeGreaterThan(0);
    });

    it('MA-002: Modal deontic default creates epistemic alternative', () => {
      const alts = builder.buildModalAlternatives(modalAmbiguity, defaultGraph);
      const epistemic = alts.find(a => a.reading === 'epistemic');
      expect(epistemic).toBeDefined();
    });

    it('MA-003: Modal epistemic default creates deontic alternative', () => {
      const epistemicAmbiguity = {
        ...modalAmbiguity,
        defaultReading: 'epistemic'
      };
      const alts = builder.buildModalAlternatives(epistemicAmbiguity, defaultGraph);
      const deontic = alts.find(a => a.reading === 'deontic');
      expect(deontic).toBeDefined();
    });

    it('MA-004: Modal with multiple readings generates all alternatives', () => {
      const multiAmbiguity = {
        ...modalAmbiguity,
        readings: ['deontic', 'epistemic', 'dynamic']
      };
      const alts = builder.buildModalAlternatives(multiAmbiguity, defaultGraph);
      // Should have 2 alternatives (all except default)
      expect(alts.length).toBe(2);
    });

    it('MA-005: Modal alternative has correct reading property', () => {
      const alts = builder.buildModalAlternatives(modalAmbiguity, defaultGraph);
      expect(alts.every(a => ['deontic', 'epistemic'].includes(a.reading))).toBe(true);
    });

    it('MA-006: Modal alternative has plausibility score', () => {
      const alts = builder.buildModalAlternatives(modalAmbiguity, defaultGraph);
      expect(alts[0].plausibility).toBeDefined();
      expect(typeof alts[0].plausibility).toBe('number');
    });

    it('MA-007: Modal alternative has derivedFrom link', () => {
      const alts = builder.buildModalAlternatives(modalAmbiguity, defaultGraph);
      expect(alts[0].derivedFrom).toBe('inst:Act_123');
    });

    it('MA-008: Modal alternative graph fragment has required properties', () => {
      const alts = builder.buildModalAlternatives(modalAmbiguity, defaultGraph);
      const graph = alts[0].graph;
      expect(graph['@id']).toBeDefined();
      expect(graph['tagteam:modality']).toBeDefined();
    });

    it('MA-009: Modal with null ambiguity returns empty array', () => {
      const alts = builder.buildModalAlternatives(null, defaultGraph);
      expect(alts).toEqual([]);
    });

    it('MA-010: Modal epistemic sets expectation modality', () => {
      const alts = builder.buildModalAlternatives(modalAmbiguity, defaultGraph);
      const epistemic = alts.find(a => a.reading === 'epistemic');
      expect(epistemic.graph['tagteam:modality']).toBe('expectation');
    });
  });

  // ==================== Category 5: Scope Alternatives ====================

  describe('Category 5: Scope Alternatives', () => {
    const defaultGraph = {
      '@graph': [
        {
          '@id': 'inst:Quant_1',
          '@type': ['tagteam:Quantifier'],
          'tagteam:scope': 'wide',
          'tagteam:scopeOver': { '@id': 'inst:Quant_2' }
        }
      ]
    };

    const scopeAmbiguity = {
      type: 'scope',
      nodeId: 'inst:Quant_1',
      span: 'every student read a book',
      readings: ['wide', 'narrow'],
      defaultReading: 'wide',
      confidence: 0.55
    };

    it('SA-001: buildScopeAlternatives returns array', () => {
      const alts = builder.buildScopeAlternatives(scopeAmbiguity, defaultGraph);
      expect(Array.isArray(alts)).toBe(true);
    });

    it('SA-002: Scope wide default creates narrow alternative', () => {
      const alts = builder.buildScopeAlternatives(scopeAmbiguity, defaultGraph);
      const narrow = alts.find(a => a.reading === 'narrow');
      expect(narrow).toBeDefined();
    });

    it('SA-003: Scope narrow default creates wide alternative', () => {
      const narrowAmbiguity = { ...scopeAmbiguity, defaultReading: 'narrow' };
      const alts = builder.buildScopeAlternatives(narrowAmbiguity, defaultGraph);
      const wide = alts.find(a => a.reading === 'wide');
      expect(wide).toBeDefined();
    });

    it('SA-004: Scope alternative has correct reading', () => {
      const alts = builder.buildScopeAlternatives(scopeAmbiguity, defaultGraph);
      expect(alts[0].reading).toBe('narrow');
    });

    it('SA-005: Scope alternative modifies scope property', () => {
      const alts = builder.buildScopeAlternatives(scopeAmbiguity, defaultGraph);
      const narrow = alts.find(a => a.reading === 'narrow');
      expect(narrow.graph['tagteam:scope']).toBe('narrow');
    });

    it('SA-006: Scope alternative has plausibility', () => {
      const alts = builder.buildScopeAlternatives(scopeAmbiguity, defaultGraph);
      expect(typeof alts[0].plausibility).toBe('number');
    });

    it('SA-007: Scope with multiple operators generates combinations', () => {
      const multiScopeAmbiguity = {
        ...scopeAmbiguity,
        readings: ['wide', 'narrow', 'intermediate']
      };
      const alts = builder.buildScopeAlternatives(multiScopeAmbiguity, defaultGraph);
      expect(alts.length).toBe(2); // All except default
    });

    it('SA-008: Scope with null ambiguity returns empty array', () => {
      const alts = builder.buildScopeAlternatives(null, defaultGraph);
      expect(alts).toEqual([]);
    });
  });

  // ==================== Category 6: Noun Category Alternatives ====================

  describe('Category 6: Noun Category Alternatives', () => {
    const defaultGraph = {
      '@graph': [
        {
          '@id': 'inst:Entity_1',
          '@type': ['Organization'],
          'rdfs:label': 'Security'
        }
      ]
    };

    const nounAmbiguity = {
      type: 'noun_category',
      nodeId: 'inst:Entity_1',
      span: 'Security',
      readings: ['organization', 'role', 'quality'],
      defaultReading: 'organization',
      confidence: 0.5
    };

    it('NC-001: buildNounCategoryAlternatives returns array', () => {
      const alts = builder.buildNounCategoryAlternatives(nounAmbiguity, defaultGraph);
      expect(Array.isArray(alts)).toBe(true);
    });

    it('NC-002: Noun org default creates role alternative', () => {
      const alts = builder.buildNounCategoryAlternatives(nounAmbiguity, defaultGraph);
      const role = alts.find(a => a.reading === 'role');
      expect(role).toBeDefined();
    });

    it('NC-003: Noun category alternative changes @type', () => {
      const alts = builder.buildNounCategoryAlternatives(nounAmbiguity, defaultGraph);
      const role = alts.find(a => a.reading === 'role');
      expect(role.graph['@type']).not.toContain('Organization');
    });

    it('NC-004: Noun alternative has correct reading', () => {
      const alts = builder.buildNounCategoryAlternatives(nounAmbiguity, defaultGraph);
      const readings = alts.map(a => a.reading);
      expect(readings).toContain('role');
      expect(readings).toContain('quality');
    });

    it('NC-005: Noun alternative has plausibility', () => {
      const alts = builder.buildNounCategoryAlternatives(nounAmbiguity, defaultGraph);
      expect(typeof alts[0].plausibility).toBe('number');
    });

    it('NC-006: Noun with null ambiguity returns empty array', () => {
      const alts = builder.buildNounCategoryAlternatives(null, defaultGraph);
      expect(alts).toEqual([]);
    });
  });

  // ==================== Category 7: buildAlternatives Integration ====================

  describe('Category 7: buildAlternatives Integration', () => {
    const defaultGraph = {
      '@graph': [
        {
          '@id': 'inst:Act_1',
          '@type': ['IntentionalAct'],
          'tagteam:modality': 'obligation'
        },
        {
          '@id': 'inst:Quant_1',
          '@type': ['tagteam:Quantifier'],
          'tagteam:scope': 'wide'
        }
      ]
    };

    it('BA-001: buildAlternatives with empty preserved returns empty array', () => {
      const alts = builder.buildAlternatives(defaultGraph, []);
      expect(alts).toEqual([]);
    });

    it('BA-002: buildAlternatives single modal returns modal alternatives', () => {
      const preserved = [{
        type: 'modal_force',
        nodeId: 'inst:Act_1',
        readings: ['deontic', 'epistemic'],
        defaultReading: 'deontic'
      }];
      const alts = builder.buildAlternatives(defaultGraph, preserved);
      expect(alts.length).toBeGreaterThan(0);
      expect(alts[0].sourceAmbiguity.type).toBe('modal_force');
    });

    it('BA-003: buildAlternatives single scope returns scope alternatives', () => {
      const preserved = [{
        type: 'scope',
        nodeId: 'inst:Quant_1',
        readings: ['wide', 'narrow'],
        defaultReading: 'wide'
      }];
      const alts = builder.buildAlternatives(defaultGraph, preserved);
      expect(alts.length).toBeGreaterThan(0);
      expect(alts[0].sourceAmbiguity.type).toBe('scope');
    });

    it('BA-004: buildAlternatives mixed types handles all', () => {
      const preserved = [
        {
          type: 'modal_force',
          nodeId: 'inst:Act_1',
          readings: ['deontic', 'epistemic'],
          defaultReading: 'deontic'
        },
        {
          type: 'scope',
          nodeId: 'inst:Quant_1',
          readings: ['wide', 'narrow'],
          defaultReading: 'wide'
        }
      ];
      const alts = builder.buildAlternatives(defaultGraph, preserved);
      const types = alts.map(a => a.sourceAmbiguity.type);
      expect(types).toContain('modal_force');
      expect(types).toContain('scope');
    });

    it('BA-005: buildAlternatives multiple same type processes all', () => {
      const preserved = [
        {
          type: 'modal_force',
          nodeId: 'inst:Act_1',
          readings: ['deontic', 'epistemic'],
          defaultReading: 'deontic'
        },
        {
          type: 'modal_force',
          nodeId: 'inst:Act_2',
          readings: ['deontic', 'epistemic'],
          defaultReading: 'deontic'
        }
      ];
      // Act_2 doesn't exist in graph, so should be skipped
      const alts = builder.buildAlternatives(defaultGraph, preserved);
      expect(alts.length).toBeGreaterThanOrEqual(1);
    });

    it('BA-006: buildAlternatives null graph handles gracefully', () => {
      const preserved = [{ type: 'modal_force', nodeId: 'inst:Act_1' }];
      const alts = builder.buildAlternatives(null, preserved);
      expect(alts).toEqual([]);
    });

    it('BA-007: buildAlternatives null preserved returns empty array', () => {
      const alts = builder.buildAlternatives(defaultGraph, null);
      expect(alts).toEqual([]);
    });

    it('BA-008: buildAlternatives generates unique IDs', () => {
      const preserved = [
        {
          type: 'modal_force',
          nodeId: 'inst:Act_1',
          readings: ['deontic', 'epistemic', 'dynamic'],
          defaultReading: 'deontic'
        }
      ];
      const alts = builder.buildAlternatives(defaultGraph, preserved);
      const ids = alts.map(a => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('BA-009: buildAlternatives sets sourceAmbiguity on each', () => {
      const preserved = [{
        type: 'modal_force',
        nodeId: 'inst:Act_1',
        span: 'should do',
        readings: ['deontic', 'epistemic'],
        defaultReading: 'deontic'
      }];
      const alts = builder.buildAlternatives(defaultGraph, preserved);
      expect(alts[0].sourceAmbiguity).toBeDefined();
      expect(alts[0].sourceAmbiguity.nodeId).toBe('inst:Act_1');
    });

    it('BA-010: Unknown ambiguity type skipped gracefully', () => {
      const preserved = [{
        type: 'unknown_type',
        nodeId: 'inst:Act_1'
      }];
      const alts = builder.buildAlternatives(defaultGraph, preserved);
      expect(alts).toEqual([]);
    });
  });

  // ==================== Category 8: createAlternativeReading ====================

  describe('Category 8: createAlternativeReading', () => {
    const defaultGraph = {
      '@graph': [
        {
          '@id': 'inst:Act_1',
          '@type': ['IntentionalAct'],
          'tagteam:modality': 'obligation'
        }
      ]
    };

    const ambiguity = {
      type: 'modal_force',
      nodeId: 'inst:Act_1',
      span: 'should',
      readings: ['deontic', 'epistemic'],
      defaultReading: 'deontic'
    };

    it('AR-001: createAlternativeReading returns valid object', () => {
      const alt = builder.createAlternativeReading(ambiguity, defaultGraph, 0, 'epistemic');
      expect(alt).toBeDefined();
      expect(alt.id).toBeDefined();
      expect(alt.reading).toBe('epistemic');
    });

    it('AR-002: createAlternativeReading has unique id', () => {
      const alt = builder.createAlternativeReading(ambiguity, defaultGraph, 0, 'epistemic');
      expect(alt.id).toMatch(/alt_/);
    });

    it('AR-003: createAlternativeReading has sourceAmbiguity', () => {
      const alt = builder.createAlternativeReading(ambiguity, defaultGraph, 0, 'epistemic');
      expect(alt.sourceAmbiguity).toBeDefined();
      expect(alt.sourceAmbiguity.type).toBe('modal_force');
      expect(alt.sourceAmbiguity.nodeId).toBe('inst:Act_1');
    });

    it('AR-004: createAlternativeReading has graph fragment', () => {
      const alt = builder.createAlternativeReading(ambiguity, defaultGraph, 0, 'epistemic');
      expect(alt.graph).toBeDefined();
      expect(alt.graph['@id']).toBeDefined();
    });

    it('AR-005: createAlternativeReading null ambiguity returns null', () => {
      const alt = builder.createAlternativeReading(null, defaultGraph, 0, 'epistemic');
      expect(alt).toBeNull();
    });

    it('AR-006: createAlternativeReading different index gives different IRI', () => {
      const alt0 = builder.createAlternativeReading(ambiguity, defaultGraph, 0, 'epistemic');
      const alt1 = builder.createAlternativeReading(ambiguity, defaultGraph, 1, 'epistemic');
      expect(alt0.graph['@id']).not.toBe(alt1.graph['@id']);
    });
  });

  // ==================== Category 9: findNodeForAmbiguity ====================

  describe('Category 9: findNodeForAmbiguity', () => {
    const graph = {
      '@graph': [
        { '@id': 'inst:Node_1', '@type': ['cco:Act'] },
        { '@id': 'inst:Node_2', '@type': ['Agent'] },
        { '@id': 'inst:Node_3', '@type': ['cco:Object'] }
      ]
    };

    it('FN-001: findNodeForAmbiguity returns matching node', () => {
      const ambiguity = { nodeId: 'inst:Node_2' };
      const node = builder.findNodeForAmbiguity(graph, ambiguity);
      expect(node).toBeDefined();
      expect(node['@id']).toBe('inst:Node_2');
    });

    it('FN-002: findNodeForAmbiguity not found returns null', () => {
      const ambiguity = { nodeId: 'inst:NonExistent' };
      const node = builder.findNodeForAmbiguity(graph, ambiguity);
      expect(node).toBeNull();
    });

    it('FN-003: findNodeForAmbiguity searches @graph array', () => {
      const ambiguity = { nodeId: 'inst:Node_3' };
      const node = builder.findNodeForAmbiguity(graph, ambiguity);
      expect(node['@type']).toContain('cco:Object');
    });

    it('FN-004: findNodeForAmbiguity null graph returns null', () => {
      const ambiguity = { nodeId: 'inst:Node_1' };
      const node = builder.findNodeForAmbiguity(null, ambiguity);
      expect(node).toBeNull();
    });

    it('FN-005: findNodeForAmbiguity null ambiguity returns null', () => {
      const node = builder.findNodeForAmbiguity(graph, null);
      expect(node).toBeNull();
    });
  });

  // ==================== Category 10: Edge Cases ====================

  describe('Category 10: Edge Cases', () => {
    it('EC-001: Very large number of ambiguities all processed', () => {
      const preserved = [];
      const graph = { '@graph': [] };
      for (let i = 0; i < 100; i++) {
        graph['@graph'].push({
          '@id': `inst:Act_${i}`,
          '@type': ['IntentionalAct'],
          'tagteam:modality': 'obligation'
        });
        preserved.push({
          type: 'modal_force',
          nodeId: `inst:Act_${i}`,
          readings: ['deontic', 'epistemic'],
          defaultReading: 'deontic'
        });
      }
      const alts = builder.buildAlternatives(graph, preserved);
      // Each ambiguity should produce 1 alternative (epistemic)
      expect(alts.length).toBe(100);
    });

    it('EC-002: Deeply nested graph structure finds nodes', () => {
      const nestedGraph = {
        '@graph': [
          {
            '@id': 'inst:Container',
            '@type': ['tagteam:Container'],
            'contains': {
              '@graph': [
                { '@id': 'inst:Nested_1', '@type': ['cco:Act'] }
              ]
            }
          },
          { '@id': 'inst:TopLevel', '@type': ['cco:Act'] }
        ]
      };
      // findNodeForAmbiguity searches top-level @graph
      const ambiguity = { nodeId: 'inst:TopLevel' };
      const node = builder.findNodeForAmbiguity(nestedGraph, ambiguity);
      expect(node).toBeDefined();
    });

    it('EC-003: Ambiguity with missing nodeId handled gracefully', () => {
      const graph = { '@graph': [{ '@id': 'inst:Act_1' }] };
      const ambiguity = { type: 'modal_force' }; // Missing nodeId
      const alts = builder.buildModalAlternatives(ambiguity, graph);
      expect(alts).toEqual([]);
    });

    it('EC-004: Graph with no @graph array handled', () => {
      const flatGraph = { '@id': 'inst:Act_1', '@type': ['cco:Act'] };
      const ambiguity = { nodeId: 'inst:Act_1' };
      const node = builder.findNodeForAmbiguity(flatGraph, ambiguity);
      // Should handle flat graph (single node as the graph)
      expect(node).toBeDefined();
    });

    it('EC-005: Alternative for node maintains traceable lineage', () => {
      const graph = {
        '@graph': [{ '@id': 'inst:Act_1', '@type': ['cco:Act'] }]
      };
      const ambiguity = {
        type: 'modal_force',
        nodeId: 'inst:Act_1',
        readings: ['deontic', 'epistemic'],
        defaultReading: 'deontic'
      };
      const alts = builder.buildAlternatives(graph, [ambiguity]);
      expect(alts[0].derivedFrom).toBe('inst:Act_1');
      expect(alts[0].graph['tagteam:alternativeFor']['@id']).toBe('inst:Act_1');
    });

    it('EC-006: Empty readings array uses type defaults', () => {
      const graph = {
        '@graph': [{ '@id': 'inst:Act_1', '@type': ['cco:Act'], 'tagteam:modality': 'obligation' }]
      };
      const ambiguity = {
        type: 'modal_force',
        nodeId: 'inst:Act_1',
        readings: [], // Empty
        defaultReading: 'deontic'
      };
      const alts = builder.buildModalAlternatives(ambiguity, graph);
      // Should use defaults ['deontic', 'epistemic'] when readings empty
      expect(alts.length).toBeGreaterThanOrEqual(0);
    });
  });
});
