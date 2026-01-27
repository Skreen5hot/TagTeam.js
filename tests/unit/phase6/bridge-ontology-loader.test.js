/**
 * @file tests/unit/phase6/bridge-ontology-loader.test.js
 * @description Phase 6.5.4 - BridgeOntologyLoader Test Suite
 *
 * Tests for loading and querying bridge ontologies that map between:
 * - TagTeam 50 values ↔ ValueNet dispositions
 * - ValueNet dispositions ↔ IEE worldview values
 *
 * Uses owl:sameAs for equivalence and ethics:relatedTo for associations.
 */

const BridgeOntologyLoader = require('../../../src/ontology/BridgeOntologyLoader.js');
const OntologyManager = require('../../../src/ontology/OntologyManager.js');

// =============================================================================
// Test Data
// =============================================================================

// Example bridge ontology TTL content
const BRIDGE_TTL = `
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix tagteam: <https://tagteam.js/ontology/values#> .
@prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
@prefix iee: <https://iee.org/ontology/worldview#> .
@prefix ethics: <https://ethics.org/ontology#> .

# TagTeam → ValueNet equivalences (owl:sameAs)
tagteam:Autonomy owl:sameAs vn:AutonomyDisposition .
tagteam:Security owl:sameAs vn:SecurityDisposition .
tagteam:Beneficence owl:sameAs vn:BeneficenceDisposition .
tagteam:Justice owl:sameAs vn:JusticeDisposition .
tagteam:Privacy owl:sameAs vn:PrivacyDisposition .

# ValueNet → IEE worldview mappings (ethics:mapsToWorldview)
vn:AutonomyDisposition ethics:mapsToWorldview iee:SelfDirectionWorldview .
vn:SecurityDisposition ethics:mapsToWorldview iee:SecurityWorldview .
vn:BeneficenceDisposition ethics:mapsToWorldview iee:BenevolenceWorldview .
vn:JusticeDisposition ethics:mapsToWorldview iee:UniversalismWorldview .

# Related value connections (not identical, but related)
tagteam:Safety ethics:relatedTo vn:SecurityDisposition .
tagteam:Freedom ethics:relatedTo vn:AutonomyDisposition .
tagteam:Fairness ethics:relatedTo vn:JusticeDisposition .

# Subsumption relationships
vn:SecurityDisposition ethics:subsumedBy vn:SafetyCategory .
vn:AutonomyDisposition ethics:subsumedBy vn:FreedomCategory .

# Inverse relationships (owl:sameAs is symmetric)
vn:NonMaleficence owl:sameAs tagteam:DoNoHarm .

# Labels for values
tagteam:Autonomy rdfs:label "Autonomy" .
tagteam:Security rdfs:label "Security" .
vn:AutonomyDisposition rdfs:label "Autonomy Disposition" .
vn:SecurityDisposition rdfs:label "Security Disposition" .
iee:SelfDirectionWorldview rdfs:label "Self-Direction" .
iee:SecurityWorldview rdfs:label "Security" .
`;

// Minimal bridge TTL for simple tests
const SIMPLE_BRIDGE_TTL = `
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix tagteam: <https://tagteam.js/ontology/values#> .
@prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .

tagteam:Autonomy owl:sameAs vn:AutonomyDisposition .
tagteam:Security owl:sameAs vn:SecurityDisposition .
`;

// ValueNet TTL for testing full pipeline
const VALUENET_TTL = `
@prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
@prefix bfo: <http://purl.obolibrary.org/obo/BFO_> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

vn:SecurityDisposition a bfo:0000016 ;
    rdfs:label "Security" ;
    vn:keywords "safety, stability, protection" ;
    vn:upholdingTerms "protect, secure, safeguard" ;
    vn:violatingTerms "endanger, threaten, risk" .

vn:AutonomyDisposition a bfo:0000016 ;
    rdfs:label "Autonomy" ;
    vn:keywords "choice, freedom, self-determination" ;
    vn:upholdingTerms "respect, empower, enable" ;
    vn:violatingTerms "coerce, force, manipulate" .
`;

// =============================================================================
// Test Suite: Constructor and Initialization
// =============================================================================

describe('BridgeOntologyLoader', () => {
  describe('1. Constructor and Initialization', () => {
    it('BO-001: creates with default options', () => {
      const loader = new BridgeOntologyLoader();

      expect(loader).toBeDefined();
      expect(loader.getMappings().length).toBe(0);
    });

    it('BO-002: creates with OntologyManager instance', () => {
      const manager = new OntologyManager();
      const loader = new BridgeOntologyLoader({ ontologyManager: manager });

      expect(loader.getOntologyManager()).toBe(manager);
    });

    it('BO-003: creates internal OntologyManager if none provided', () => {
      const loader = new BridgeOntologyLoader();

      expect(loader.getOntologyManager()).toBeInstanceOf(OntologyManager);
    });

    it('BO-004: accepts custom namespace mappings', () => {
      const loader = new BridgeOntologyLoader({
        namespaces: {
          tagteam: 'https://tagteam.js/ontology/values#',
          vn: 'https://fandaws.com/ontology/bfo/valuenet#'
        }
      });

      const namespaces = loader.getNamespaces();
      expect(namespaces.tagteam).toBe('https://tagteam.js/ontology/values#');
      expect(namespaces.vn).toBe('https://fandaws.com/ontology/bfo/valuenet#');
    });

    it('BO-005: has default namespace mappings', () => {
      const loader = new BridgeOntologyLoader();
      const namespaces = loader.getNamespaces();

      expect(namespaces.owl).toBeDefined();
      expect(namespaces.rdfs).toBeDefined();
    });

    it('BO-006: tracks loading state', () => {
      const loader = new BridgeOntologyLoader();

      expect(loader.isLoaded()).toBe(false);
    });
  });

  // ===========================================================================
  // Test Suite: Loading Bridge Ontologies
  // ===========================================================================

  describe('2. Loading Bridge Ontologies', () => {
    it('BO-010: loads bridge ontology from TTL string', () => {
      const loader = new BridgeOntologyLoader();
      const result = loader.loadFromString(SIMPLE_BRIDGE_TTL);

      expect(result.success).toBe(true);
      expect(loader.isLoaded()).toBe(true);
    });

    it('BO-011: extracts owl:sameAs mappings', () => {
      const loader = new BridgeOntologyLoader();
      loader.loadFromString(SIMPLE_BRIDGE_TTL);

      const mappings = loader.getEquivalenceMappings();

      expect(mappings.length).toBeGreaterThan(0);
      expect(mappings.some(m =>
        m.source.includes('Autonomy') && m.target.includes('AutonomyDisposition')
      )).toBe(true);
    });

    it('BO-012: extracts ethics:relatedTo mappings', () => {
      const loader = new BridgeOntologyLoader();
      loader.loadFromString(BRIDGE_TTL);

      const related = loader.getRelatedMappings();

      expect(related.length).toBeGreaterThan(0);
      expect(related.some(m =>
        m.source.includes('Safety') && m.target.includes('SecurityDisposition')
      )).toBe(true);
    });

    it('BO-013: extracts ethics:mapsToWorldview mappings', () => {
      const loader = new BridgeOntologyLoader();
      loader.loadFromString(BRIDGE_TTL);

      const worldviewMappings = loader.getWorldviewMappings();

      expect(worldviewMappings.length).toBeGreaterThan(0);
      expect(worldviewMappings.some(m =>
        m.source.includes('AutonomyDisposition') && m.target.includes('SelfDirectionWorldview')
      )).toBe(true);
    });

    it('BO-014: extracts subsumption relationships', () => {
      const loader = new BridgeOntologyLoader();
      loader.loadFromString(BRIDGE_TTL);

      const subsumptions = loader.getSubsumptionMappings();

      expect(subsumptions.length).toBeGreaterThan(0);
      expect(subsumptions.some(m =>
        m.source.includes('SecurityDisposition') && m.target.includes('SafetyCategory')
      )).toBe(true);
    });

    it('BO-015: returns mapping count in result', () => {
      const loader = new BridgeOntologyLoader();
      const result = loader.loadFromString(BRIDGE_TTL);

      expect(result.mappingCount).toBeGreaterThan(0);
      expect(result.equivalenceCount).toBeGreaterThan(0);
    });

    it('BO-016: handles empty TTL gracefully', () => {
      const loader = new BridgeOntologyLoader();
      const result = loader.loadFromString('');

      expect(result.success).toBe(true);
      expect(result.mappingCount).toBe(0);
    });

    it('BO-017: handles TTL with only prefixes', () => {
      const loader = new BridgeOntologyLoader();
      const result = loader.loadFromString(`
        @prefix owl: <http://www.w3.org/2002/07/owl#> .
        @prefix tagteam: <https://tagteam.js/ontology/values#> .
      `);

      expect(result.success).toBe(true);
      expect(result.mappingCount).toBe(0);
    });

    it('BO-018: loads multiple bridge files (merge)', () => {
      const loader = new BridgeOntologyLoader();

      loader.loadFromString(SIMPLE_BRIDGE_TTL);
      const count1 = loader.getMappings().length;

      loader.loadFromString(`
        @prefix owl: <http://www.w3.org/2002/07/owl#> .
        @prefix tagteam: <https://tagteam.js/ontology/values#> .
        @prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
        tagteam:Justice owl:sameAs vn:JusticeDisposition .
      `, { merge: true });

      const count2 = loader.getMappings().length;
      expect(count2).toBeGreaterThan(count1);
    });
  });

  // ===========================================================================
  // Test Suite: Query Methods - Equivalence
  // ===========================================================================

  describe('3. Equivalence Queries', () => {
    let loader;

    beforeEach(() => {
      loader = new BridgeOntologyLoader();
      loader.loadFromString(BRIDGE_TTL);
    });

    it('BO-020: finds equivalent by source IRI', () => {
      const equivalent = loader.findEquivalent('tagteam:Autonomy');

      expect(equivalent).toBeDefined();
      expect(equivalent).toContain('AutonomyDisposition');
    });

    it('BO-021: finds equivalent by local name', () => {
      const equivalent = loader.findEquivalent('Autonomy');

      expect(equivalent).toBeDefined();
      expect(equivalent).toContain('AutonomyDisposition');
    });

    it('BO-022: returns null for unknown value', () => {
      const equivalent = loader.findEquivalent('UnknownValue');

      expect(equivalent).toBeNull();
    });

    it('BO-023: supports reverse lookup (ValueNet → TagTeam)', () => {
      const equivalent = loader.findEquivalent('vn:AutonomyDisposition', { reverse: true });

      expect(equivalent).toBeDefined();
      expect(equivalent).toContain('Autonomy');
    });

    it('BO-024: handles owl:sameAs symmetry', () => {
      // owl:sameAs is symmetric - A sameAs B implies B sameAs A
      const forward = loader.findEquivalent('tagteam:Autonomy');
      const reverse = loader.findEquivalent('vn:AutonomyDisposition');

      // Both should find a mapping (loader should handle symmetry)
      expect(forward).toBeDefined();
      expect(reverse).toBeDefined();
    });

    it('BO-025: gets all TagTeam → ValueNet equivalences', () => {
      const tagteamToVN = loader.getEquivalencesFrom('tagteam');

      expect(tagteamToVN.length).toBeGreaterThan(0);
      expect(tagteamToVN.every(m => m.source.includes('tagteam'))).toBe(true);
    });

    it('BO-026: gets all ValueNet → IEE equivalences', () => {
      const vnToIEE = loader.getWorldviewMappings();

      expect(vnToIEE.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Test Suite: Query Methods - Related Values
  // ===========================================================================

  describe('4. Related Value Queries', () => {
    let loader;

    beforeEach(() => {
      loader = new BridgeOntologyLoader();
      loader.loadFromString(BRIDGE_TTL);
    });

    it('BO-030: finds related values', () => {
      const related = loader.findRelated('tagteam:Safety');

      expect(related).toBeDefined();
      expect(related.length).toBeGreaterThan(0);
      expect(related.some(r => r.includes('SecurityDisposition'))).toBe(true);
    });

    it('BO-031: finds related by local name', () => {
      const related = loader.findRelated('Safety');

      expect(related.length).toBeGreaterThan(0);
    });

    it('BO-032: returns empty array for unrelated value', () => {
      const related = loader.findRelated('UnrelatedValue');

      expect(related).toEqual([]);
    });

    it('BO-033: finds all related values for a namespace', () => {
      const related = loader.getRelatedFrom('tagteam');

      expect(related.length).toBeGreaterThan(0);
    });

    it('BO-034: distinguishes related from equivalent', () => {
      // Safety is related to Security, not equivalent
      const equivalent = loader.findEquivalent('tagteam:Safety');
      const related = loader.findRelated('tagteam:Safety');

      // Safety has no equivalence mapping
      expect(equivalent).toBeNull();
      // But has related mappings
      expect(related.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Test Suite: Worldview Mapping
  // ===========================================================================

  describe('5. Worldview Mapping', () => {
    let loader;

    beforeEach(() => {
      loader = new BridgeOntologyLoader();
      loader.loadFromString(BRIDGE_TTL);
    });

    it('BO-040: maps ValueNet disposition to IEE worldview', () => {
      const worldview = loader.findWorldview('vn:AutonomyDisposition');

      expect(worldview).toBeDefined();
      expect(worldview).toContain('SelfDirectionWorldview');
    });

    it('BO-041: maps TagTeam value through to IEE worldview', () => {
      // TagTeam → ValueNet → IEE (chained mapping)
      const worldview = loader.findWorldviewForTagTeam('tagteam:Autonomy');

      expect(worldview).toBeDefined();
      expect(worldview).toContain('SelfDirectionWorldview');
    });

    it('BO-042: returns null for unmapped value', () => {
      const worldview = loader.findWorldview('vn:UnmappedDisposition');

      expect(worldview).toBeNull();
    });

    it('BO-043: gets all worldview mappings', () => {
      const worldviews = loader.getAllWorldviewMappings();

      expect(worldviews).toBeDefined();
      expect(Object.keys(worldviews).length).toBeGreaterThan(0);
    });

    it('BO-044: finds multiple values mapping to same worldview', () => {
      const securityWorldview = loader.findValuesForWorldview('iee:SecurityWorldview');

      expect(securityWorldview).toBeDefined();
      expect(securityWorldview.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Test Suite: Full Pipeline Integration
  // ===========================================================================

  describe('6. Full Pipeline Integration', () => {
    it('BO-050: loads ValueNet + Bridge and resolves TagTeam value', () => {
      const manager = new OntologyManager();
      manager.loadFromString(VALUENET_TTL, { format: 'turtle', namespace: 'vn' });

      const loader = new BridgeOntologyLoader({ ontologyManager: manager });
      loader.loadFromString(BRIDGE_TTL);

      // TagTeam:Autonomy → vn:AutonomyDisposition
      const equivalent = loader.findEquivalent('tagteam:Autonomy');
      expect(equivalent).toContain('AutonomyDisposition');

      // Get the actual value definition from OntologyManager
      const valueDef = manager.getValueDefinition('AutonomyDisposition');
      expect(valueDef).toBeDefined();
      expect(valueDef.keywords).toContain('choice');
    });

    it('BO-051: resolves TagTeam value to full definition via bridge', () => {
      const manager = new OntologyManager();
      manager.loadFromString(VALUENET_TTL, { format: 'turtle', namespace: 'vn' });

      const loader = new BridgeOntologyLoader({ ontologyManager: manager });
      loader.loadFromString(BRIDGE_TTL);

      // High-level method that does full resolution
      const resolved = loader.resolveValue('tagteam:Security');

      expect(resolved).toBeDefined();
      expect(resolved.keywords).toContain('safety');
      expect(resolved.upholdingTerms).toContain('protect');
    });

    it('BO-052: builds complete mapping chain', () => {
      const loader = new BridgeOntologyLoader();
      loader.loadFromString(BRIDGE_TTL);

      // Get full chain: TagTeam → ValueNet → IEE
      const chain = loader.getMappingChain('tagteam:Autonomy');

      expect(chain.tagteamValue).toContain('Autonomy');
      expect(chain.valuenetDisposition).toContain('AutonomyDisposition');
      expect(chain.ieeWorldview).toContain('SelfDirectionWorldview');
    });

    it('BO-053: handles partial chains gracefully', () => {
      const loader = new BridgeOntologyLoader();
      loader.loadFromString(BRIDGE_TTL);

      // Privacy doesn't have IEE worldview mapping in test data
      const chain = loader.getMappingChain('tagteam:Privacy');

      expect(chain.tagteamValue).toContain('Privacy');
      expect(chain.valuenetDisposition).toContain('PrivacyDisposition');
      expect(chain.ieeWorldview).toBeNull(); // No worldview mapping
    });
  });

  // ===========================================================================
  // Test Suite: Batch Operations
  // ===========================================================================

  describe('7. Batch Operations', () => {
    let loader;

    beforeEach(() => {
      loader = new BridgeOntologyLoader();
      loader.loadFromString(BRIDGE_TTL);
    });

    it('BO-060: resolves multiple values at once', () => {
      const values = ['tagteam:Autonomy', 'tagteam:Security', 'tagteam:Justice'];
      const resolved = loader.resolveAll(values);

      expect(resolved.length).toBe(3);
      expect(resolved.every(r => r.valuenetDisposition !== null)).toBe(true);
    });

    it('BO-061: handles mix of found and not-found in batch', () => {
      const values = ['tagteam:Autonomy', 'tagteam:Unknown', 'tagteam:Security'];
      const resolved = loader.resolveAll(values);

      expect(resolved.length).toBe(3);
      expect(resolved[0].found).toBe(true);
      expect(resolved[1].found).toBe(false);
      expect(resolved[2].found).toBe(true);
    });

    it('BO-062: gets all mappings as lookup table', () => {
      const lookup = loader.toLookupTable();

      expect(lookup).toBeDefined();
      expect(typeof lookup).toBe('object');
      expect(lookup['tagteam:Autonomy']).toBeDefined();
    });

    it('BO-063: exports mappings to JSON', () => {
      const json = loader.toJSON();

      expect(json.equivalences).toBeDefined();
      expect(json.related).toBeDefined();
      expect(json.worldviews).toBeDefined();
    });
  });

  // ===========================================================================
  // Test Suite: Custom Predicates
  // ===========================================================================

  describe('8. Custom Predicates', () => {
    it('BO-070: supports custom equivalence predicates', () => {
      const customTTL = `
        @prefix custom: <https://custom.org/ontology#> .
        @prefix tagteam: <https://tagteam.js/ontology/values#> .
        @prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .

        tagteam:Trust custom:equivalentTo vn:TrustDisposition .
      `;

      const loader = new BridgeOntologyLoader({
        equivalencePredicates: ['owl:sameAs', 'custom:equivalentTo']
      });
      loader.loadFromString(customTTL);

      const equivalent = loader.findEquivalent('tagteam:Trust');
      expect(equivalent).toContain('TrustDisposition');
    });

    it('BO-071: supports custom related predicates', () => {
      const customTTL = `
        @prefix custom: <https://custom.org/ontology#> .
        @prefix tagteam: <https://tagteam.js/ontology/values#> .
        @prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .

        tagteam:Care custom:associatedWith vn:BeneficenceDisposition .
      `;

      const loader = new BridgeOntologyLoader({
        relatedPredicates: ['ethics:relatedTo', 'custom:associatedWith']
      });
      loader.loadFromString(customTTL);

      const related = loader.findRelated('tagteam:Care');
      expect(related.some(r => r.includes('BeneficenceDisposition'))).toBe(true);
    });

    it('BO-072: supports custom worldview predicates', () => {
      const customTTL = `
        @prefix custom: <https://custom.org/ontology#> .
        @prefix vn: <https://fandaws.com/ontology/bfo/valuenet#> .
        @prefix iee: <https://iee.org/ontology/worldview#> .

        vn:CareDisposition custom:worldviewMapping iee:BenevolenceWorldview .
      `;

      const loader = new BridgeOntologyLoader({
        worldviewPredicates: ['ethics:mapsToWorldview', 'custom:worldviewMapping']
      });
      loader.loadFromString(customTTL);

      const worldview = loader.findWorldview('vn:CareDisposition');
      expect(worldview).toContain('BenevolenceWorldview');
    });
  });

  // ===========================================================================
  // Test Suite: Error Handling
  // ===========================================================================

  describe('9. Error Handling', () => {
    it('BO-080: handles malformed TTL gracefully', () => {
      const loader = new BridgeOntologyLoader();

      expect(() => {
        loader.loadFromString('invalid TTL { not valid }');
      }).not.toThrow();

      // Should still work, just with no mappings
      expect(loader.getMappings().length).toBe(0);
    });

    it('BO-081: handles null/undefined input', () => {
      const loader = new BridgeOntologyLoader();

      expect(() => loader.loadFromString(null)).not.toThrow();
      expect(() => loader.loadFromString(undefined)).not.toThrow();
    });

    it('BO-082: handles missing predicates in queries', () => {
      const loader = new BridgeOntologyLoader();
      loader.loadFromString(SIMPLE_BRIDGE_TTL);

      // Query for something that doesn't exist
      const result = loader.findRelated('NonExistent');
      expect(result).toEqual([]);
    });

    it('BO-083: reports parsing errors', () => {
      const loader = new BridgeOntologyLoader();
      const result = loader.loadFromString('not valid turtle at all!!!');

      expect(result.errors).toBeDefined();
    });
  });

  // ===========================================================================
  // Test Suite: Clear and Reset
  // ===========================================================================

  describe('10. Clear and Reset', () => {
    it('BO-090: clears all mappings', () => {
      const loader = new BridgeOntologyLoader();
      loader.loadFromString(BRIDGE_TTL);

      expect(loader.getMappings().length).toBeGreaterThan(0);

      loader.clear();

      expect(loader.getMappings().length).toBe(0);
      expect(loader.isLoaded()).toBe(false);
    });

    it('BO-091: reloads after clear', () => {
      const loader = new BridgeOntologyLoader();
      loader.loadFromString(BRIDGE_TTL);
      loader.clear();
      loader.loadFromString(SIMPLE_BRIDGE_TTL);

      expect(loader.getMappings().length).toBeGreaterThan(0);
    });

    it('BO-092: clear does not affect OntologyManager', () => {
      const manager = new OntologyManager();
      manager.loadFromString(VALUENET_TTL, { format: 'turtle', namespace: 'vn' });

      const loader = new BridgeOntologyLoader({ ontologyManager: manager });
      loader.loadFromString(BRIDGE_TTL);
      loader.clear();

      // OntologyManager should still have its values
      const valueDef = manager.getValueDefinition('SecurityDisposition');
      expect(valueDef).toBeDefined();
    });
  });

  // ===========================================================================
  // Test Suite: Statistics and Metadata
  // ===========================================================================

  describe('11. Statistics and Metadata', () => {
    let loader;

    beforeEach(() => {
      loader = new BridgeOntologyLoader();
      loader.loadFromString(BRIDGE_TTL);
    });

    it('BO-100: returns mapping statistics', () => {
      const stats = loader.getStats();

      expect(stats.totalMappings).toBeGreaterThan(0);
      expect(stats.equivalenceMappings).toBeGreaterThan(0);
      expect(stats.relatedMappings).toBeGreaterThan(0);
      expect(stats.worldviewMappings).toBeGreaterThan(0);
    });

    it('BO-101: tracks namespaces used', () => {
      const namespaces = loader.getUsedNamespaces();

      expect(namespaces).toContain('tagteam');
      expect(namespaces).toContain('vn');
      expect(namespaces).toContain('iee');
    });

    it('BO-102: returns loaded sources metadata', () => {
      const sources = loader.getLoadedSources();

      expect(sources.length).toBeGreaterThan(0);
      expect(sources[0].loadedAt).toBeDefined();
    });

    it('BO-103: reports coverage statistics', () => {
      const coverage = loader.getCoverage();

      expect(coverage.tagteamValues).toBeDefined();
      expect(coverage.valuenetDispositions).toBeDefined();
      expect(coverage.ieeWorldviews).toBeDefined();
    });
  });
});

// =============================================================================
// Run tests
// =============================================================================

if (require.main === module) {
  const Jasmine = require('jasmine');
  const jasmine = new Jasmine();

  jasmine.loadConfig({
    spec_files: [__filename],
    random: false
  });

  jasmine.execute();
}
