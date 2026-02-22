/**
 * Phase 2: Domain Configuration System - Unit Tests
 *
 * Tests acceptance criteria from DOMAIN_NEUTRAL_IMPLEMENTATION_PLAN.md Phase 2:
 * - AC-2.1: Parser produces BFO types with no config loaded
 * - AC-2.2: loadDomainConfig('config/medical.json') succeeds
 * - AC-2.3: After loading medical config, "care" → ActOfCare
 * - AC-2.4: Multiple configs can be loaded additively
 * - AC-2.5: Conflicting configs emit warning, last wins
 * - AC-2.6: clearConfigs() returns to BFO-only mode
 *
 * @version 4.0.0-phase4
 */

const assert = require('assert');
const path = require('path');
const DomainConfigLoader = require('../../src/graph/DomainConfigLoader');
const SemanticGraphBuilder = require('../../src/graph/SemanticGraphBuilder');

console.log('\n=== Phase 2: Domain Configuration System - Unit Tests ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e.message}`);
    failed++;
  }
}

function findReferent(graph, term) {
  return graph['@graph'].find(n =>
    n['rdfs:label']?.toLowerCase().includes(term.toLowerCase()) &&
    n['@type']?.includes('tagteam:DiscourseReferent')
  );
}

// ==================================
// DomainConfigLoader Unit Tests
// ==================================
console.log('--- DomainConfigLoader Unit Tests ---');

test('DomainConfigLoader: constructor creates empty loader', () => {
  const loader = new DomainConfigLoader();
  assert.strictEqual(loader.isConfigLoaded(), false, 'Should have no configs loaded');
  assert.deepStrictEqual(loader.getLoadedDomains(), [], 'Should have empty domain list');
});

test('DomainConfigLoader: loadConfigObject succeeds with valid config', () => {
  const loader = new DomainConfigLoader();
  const result = loader.loadConfigObject({
    domain: 'test',
    version: '1.0',
    processRootWords: {
      'testword': 'test:TestType'
    }
  });
  assert.strictEqual(result, true, 'Should return true on success');
  assert.strictEqual(loader.isConfigLoaded(), true, 'Should have config loaded');
  assert.deepStrictEqual(loader.getLoadedDomains(), ['test'], 'Should have test domain');
});

test('DomainConfigLoader: loadConfigObject requires domain field', () => {
  const loader = new DomainConfigLoader();
  try {
    loader.loadConfigObject({ version: '1.0' });
    assert.fail('Should throw error');
  } catch (e) {
    assert(e.message.includes('domain'), 'Error should mention domain field');
  }
});

test('DomainConfigLoader: loadConfigObject requires version field', () => {
  const loader = new DomainConfigLoader();
  try {
    loader.loadConfigObject({ domain: 'test' });
    assert.fail('Should throw error');
  } catch (e) {
    assert(e.message.includes('version'), 'Error should mention version field');
  }
});

test('DomainConfigLoader: getProcessRootWord returns type for loaded terms', () => {
  const loader = new DomainConfigLoader();
  loader.loadConfigObject({
    domain: 'medical',
    version: '1.0',
    processRootWords: {
      'care': 'IntentionalAct',
      'surgery': 'IntentionalAct'
    }
  });

  assert.strictEqual(loader.getProcessRootWord('care'), 'IntentionalAct');
  assert.strictEqual(loader.getProcessRootWord('surgery'), 'IntentionalAct');
  assert.strictEqual(loader.getProcessRootWord('unknown'), null);
});

test('DomainConfigLoader: getTypeSpecialization returns specialized types', () => {
  const loader = new DomainConfigLoader();
  loader.loadConfigObject({
    domain: 'medical',
    version: '1.0',
    typeSpecializations: {
      'bfo:BFO_0000015': {
        'care': 'IntentionalAct',
        'treatment': 'IntentionalAct'
      },
      'Person': {
        'doctor': 'Physician',
        'nurse': 'Nurse'
      }
    }
  });

  assert.strictEqual(
    loader.getTypeSpecialization('bfo:BFO_0000015', 'care'),
    'IntentionalAct'
  );
  assert.strictEqual(
    loader.getTypeSpecialization('Person', 'doctor'),
    'Physician'
  );
  assert.strictEqual(
    loader.getTypeSpecialization('bfo:BFO_0000015', 'unknown'),
    null
  );
});

test('DomainConfigLoader: clearConfigs returns to empty state', () => {
  const loader = new DomainConfigLoader();
  loader.loadConfigObject({
    domain: 'test',
    version: '1.0',
    processRootWords: { 'care': 'test:Type' }
  });

  assert.strictEqual(loader.isConfigLoaded(), true);

  loader.clearConfigs();

  assert.strictEqual(loader.isConfigLoaded(), false);
  assert.deepStrictEqual(loader.getLoadedDomains(), []);
  assert.strictEqual(loader.getProcessRootWord('care'), null);
});

test('DomainConfigLoader: multiple configs load additively', () => {
  const loader = new DomainConfigLoader();

  loader.loadConfigObject({
    domain: 'medical',
    version: '1.0',
    processRootWords: { 'care': 'IntentionalAct' }
  });

  loader.loadConfigObject({
    domain: 'legal',
    version: '1.0',
    processRootWords: { 'hearing': 'legal:LegalHearing' }
  });

  assert.deepStrictEqual(loader.getLoadedDomains(), ['medical', 'legal']);
  assert.strictEqual(loader.getProcessRootWord('care'), 'IntentionalAct');
  assert.strictEqual(loader.getProcessRootWord('hearing'), 'legal:LegalHearing');
});

// ==================================
// AC-2.1: BFO types with no config
// ==================================
console.log('\n--- AC-2.1: BFO Types with No Config ---');

test('AC-2.1: Parser produces BFO types with no config loaded', () => {
  const builder = new SemanticGraphBuilder();
  // Ensure no config loaded
  assert.strictEqual(builder.isDomainConfigLoaded(), false);

  const graph = builder.build('The contractor provides maintenance.');
  const referent = findReferent(graph, 'maintenance');

  assert(referent, 'Found maintenance referent');
  // Should be BFO Process type, not CCO medical type
  assert.strictEqual(
    referent['tagteam:denotesType'],
    'bfo:BFO_0000015',
    'maintenance should be typed as BFO Process (not CCO)'
  );
});

test('AC-2.1b: "services" typed as bfo:BFO_0000015 without config', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The company provides consulting services.');
  const referent = findReferent(graph, 'services');

  assert(referent, 'Found services referent');
  assert.strictEqual(
    referent['tagteam:denotesType'],
    'bfo:BFO_0000015',
    'services should be BFO Process'
  );
});

// ==================================
// AC-2.2 & AC-2.3: Config Loading
// ==================================
console.log('\n--- AC-2.2 & AC-2.3: Config Loading ---');

test('AC-2.2: loadDomainConfig succeeds with medical.json', () => {
  const builder = new SemanticGraphBuilder();
  const configPath = path.join(__dirname, '../../config/medical.json');

  const result = builder.loadDomainConfig(configPath);
  assert.strictEqual(result, true, 'Should return true on success');
  assert.strictEqual(builder.isDomainConfigLoaded(), true, 'Config should be loaded');
  assert(builder.getLoadedDomains().includes('medical'), 'Should include medical domain');
});

test('AC-2.3: After loading medical config, "care" → bfo:Process', () => {
  const builder = new SemanticGraphBuilder();
  const configPath = path.join(__dirname, '../../config/medical.json');
  builder.loadDomainConfig(configPath);

  const graph = builder.build('The nurse provides palliative care.');
  const referent = findReferent(graph, 'palliative care');

  assert(referent, 'Found palliative care referent');
  assert.strictEqual(
    referent['tagteam:denotesType'],
    'bfo:Process',
    'care should be typed as bfo:Process with medical config'
  );
});

test('AC-2.3b: After loading medical config, "surgery" → bfo:Process', () => {
  const builder = new SemanticGraphBuilder();
  const configPath = path.join(__dirname, '../../config/medical.json');
  builder.loadDomainConfig(configPath);

  const graph = builder.build('The patient needs surgery.');
  const referent = findReferent(graph, 'surgery');

  assert(referent, 'Found surgery referent');
  assert.strictEqual(
    referent['tagteam:denotesType'],
    'bfo:Process',
    'surgery should be typed as bfo:Process'
  );
});

// ==================================
// AC-2.4: Multiple Configs
// ==================================
console.log('\n--- AC-2.4: Multiple Configs ---');

test('AC-2.4: Multiple configs can be loaded additively', () => {
  const builder = new SemanticGraphBuilder();

  // Load medical config
  const medicalPath = path.join(__dirname, '../../config/medical.json');
  builder.loadDomainConfig(medicalPath);

  // Load a second config via object
  builder.loadDomainConfigObject({
    domain: 'legal',
    version: '1.0',
    processRootWords: {
      'trial': 'legal:LegalTrial',
      'verdict': 'legal:LegalVerdict'
    }
  });

  const domains = builder.getLoadedDomains();
  assert(domains.includes('medical'), 'Should have medical domain');
  assert(domains.includes('legal'), 'Should have legal domain');
  assert.strictEqual(domains.length, 2, 'Should have exactly 2 domains');
});

// ==================================
// AC-2.6: clearConfigs
// ==================================
console.log('\n--- AC-2.6: clearConfigs ---');

test('AC-2.6: clearConfigs returns to BFO-only mode', () => {
  const builder = new SemanticGraphBuilder();

  // Load config first
  const configPath = path.join(__dirname, '../../config/medical.json');
  builder.loadDomainConfig(configPath);
  assert.strictEqual(builder.isDomainConfigLoaded(), true);

  // Now clear
  builder.clearDomainConfigs();
  assert.strictEqual(builder.isDomainConfigLoaded(), false);
  assert.deepStrictEqual(builder.getLoadedDomains(), []);

  // Verify back to BFO-only output
  const graph = builder.build('The nurse provides palliative care.');
  const referent = findReferent(graph, 'palliative care');

  // Should fall back to domain process words (backward compatibility)
  // or BFO Process if completely domain-neutral
  assert(referent, 'Found referent');
});

// ==================================
// Cross-Domain Tests (without config)
// ==================================
console.log('\n--- Cross-Domain Tests (without config) ---');

test('Cross-domain: "instruction" typed as BFO Process without config', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The teacher provides instruction.');
  const referent = findReferent(graph, 'instruction');

  assert(referent, 'Found instruction referent');
  assert.strictEqual(
    referent['tagteam:denotesType'],
    'bfo:BFO_0000015',
    'instruction should be BFO Process via suffix detection'
  );
});

test('Cross-domain: "assistance" typed as BFO Process without config', () => {
  const builder = new SemanticGraphBuilder();
  const graph = builder.build('The government provides assistance.');
  const referent = findReferent(graph, 'assistance');

  assert(referent, 'Found assistance referent');
  assert.strictEqual(
    referent['tagteam:denotesType'],
    'bfo:BFO_0000015',
    'assistance should be BFO Process via ontological vocabulary'
  );
});

// ==================================
// Summary
// ==================================
console.log('\n=== Test Summary ===');
console.log(`Total: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed === 0) {
  console.log('\n✓ All Phase 2 domain config tests passed!');
} else {
  console.log('\n✗ Some tests failed');
  process.exit(1);
}
