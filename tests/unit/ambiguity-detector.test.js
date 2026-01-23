/**
 * AmbiguityDetector Unit Tests - Phase 5.3
 */

const AmbiguityDetector = require('../../src/graph/AmbiguityDetector.js');

// Test runner
function describe(name, fn) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${name}`);
  console.log('='.repeat(60));
  fn();
}

function it(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    return true;
  } catch (e) {
    console.log(`  [FAIL] ${name}`);
    console.log(`         ${e.message}`);
    return false;
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected "${expected}" but got "${actual}"`);
      }
    },
    toEqual(expected) {
      const actualStr = JSON.stringify(actual);
      const expectedStr = JSON.stringify(expected);
      if (actualStr !== expectedStr) {
        throw new Error(`Expected ${expectedStr} but got ${actualStr}`);
      }
    },
    toBeTrue() {
      if (actual !== true) throw new Error(`Expected true but got ${actual}`);
    },
    toBeFalse() {
      if (actual !== false) throw new Error(`Expected false but got ${actual}`);
    },
    toBeDefined() {
      if (actual === undefined) throw new Error('Expected value to be defined');
    },
    toHaveLength(expected) {
      if (!actual || actual.length !== expected) {
        throw new Error(`Expected length ${expected} but got ${actual ? actual.length : 0}`);
      }
    },
    toContain(item) {
      if (!actual || !actual.includes(item)) {
        throw new Error(`Expected array to contain "${item}"`);
      }
    },
    toBeGreaterThan(expected) {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    }
  };
}

let passed = 0;
let failed = 0;

const detector = new AmbiguityDetector();

// Helper to create test entities
function entity(label, id = null) {
  return {
    '@id': id || `entity_${label.replace(/\s+/g, '_')}`,
    label: label,
    sourceText: label
  };
}

// Helper to create test acts
function act(verb, opts = {}) {
  return {
    '@id': opts.id || `act_${verb}`,
    verb: verb,
    lemma: opts.lemma || verb,
    label: opts.label || verb,
    sourceText: opts.sourceText || verb,
    modal: opts.modal || null,
    negated: opts.negated || false,
    tense: opts.tense || 'present',
    auxiliary: opts.auxiliary || null,
    agent: opts.agent || null,
    patient: opts.patient || null
  };
}

describe('AmbiguityDetector', () => {

  describe('noun category ambiguity (nominalization)', () => {
    if (it('flags "-tion" nominalization as ambiguous', () => {
      const entities = [entity('organization')];
      const report = detector.detect('The organization', entities, [], []);

      const nominal = report.getByType('noun_category')[0];
      expect(nominal).toBeDefined();
      expect(nominal.readings).toContain('process');
      expect(nominal.readings).toContain('continuant');
    })) passed++; else failed++;

    if (it('flags "-ment" nominalization as ambiguous', () => {
      const entities = [entity('treatment')];
      const report = detector.detect('The treatment', entities, [], []);

      const nominal = report.getByType('noun_category')[0];
      expect(nominal).toBeDefined();
      expect(nominal.readings).toContain('process');
    })) passed++; else failed++;

    if (it('flags "-ing" nominalization as ambiguous', () => {
      const entities = [entity('organizing')];
      const report = detector.detect('The organizing', entities, [], []);

      const nominal = report.getByType('noun_category')[0];
      expect(nominal).toBeDefined();
    })) passed++; else failed++;

    if (it('skips continuant-dominant -ing words like "building"', () => {
      const entities = [entity('building')];
      const report = detector.detect('The building', entities, [], []);

      // building is in continuantDominant set, should not flag
      const nominals = report.getByType('noun_category');
      expect(nominals).toHaveLength(0);
    })) passed++; else failed++;

    if (it('does not flag non-nominalization nouns', () => {
      const entities = [entity('doctor'), entity('patient')];
      const report = detector.detect('The doctor examined the patient', entities, [], []);

      const nominals = report.getByType('noun_category');
      expect(nominals).toHaveLength(0);
    })) passed++; else failed++;

    if (it('includes nominalization suffix in result', () => {
      const entities = [entity('administration')];
      const report = detector.detect('The administration', entities, [], []);

      const nominal = report.getByType('noun_category')[0];
      expect(nominal.nominalizationSuffix).toBe('-tion');
    })) passed++; else failed++;

    if (it('detects of-complement signal for process reading', () => {
      const entities = [entity('organization of files')];
      const report = detector.detect('The organization of files', entities, [], []);

      const nominal = report.getByType('noun_category')[0];
      expect(nominal.signals).toContain('of_complement');
      expect(nominal.defaultReading).toBe('process');
    })) passed++; else failed++;

    if (it('detects agent signal for continuant reading', () => {
      const entities = [entity('organization', 'org_1')];
      const acts = [act('hired', { agent: 'org_1', id: 'act_1' })];
      const roles = [{ act: 'act_1', entity: 'org_1', type: 'agent' }];

      const report = detector.detect('The organization hired staff', entities, acts, roles);

      const nominal = report.getByType('noun_category')[0];
      expect(nominal.signals).toContain('subject_of_intentional_act');
      expect(nominal.defaultReading).toBe('continuant');
      expect(nominal.confidence).toBe('high');
    })) passed++; else failed++;
  });

  describe('selectional constraint violations', () => {
    if (it('flags inanimate agent with intentional act', () => {
      const entities = [entity('rock', 'rock_1'), entity('administrator', 'admin_1')];
      const acts = [act('hired', { agent: 'rock_1', patient: 'admin_1', id: 'act_1' })];
      const roles = [{ act: 'act_1', entity: 'rock_1', type: 'agent' }];

      const report = detector.detect('The rock hired an administrator', entities, acts, roles);

      const violation = report.getByType('selectional_violation')[0];
      expect(violation).toBeDefined();
      expect(violation.signal).toBe('inanimate_agent');
      expect(violation.subject).toBe('rock');
      expect(violation.verb).toBe('hired');
      expect(violation.confidence).toBe('high');
    })) passed++; else failed++;

    if (it('flags abstract agent with physical act', () => {
      const entities = [entity('justice', 'justice_1'), entity('box', 'box_1')];
      const acts = [act('lift', { agent: 'justice_1', patient: 'box_1', id: 'act_1', lemma: 'lift' })];
      const roles = [{ act: 'act_1', entity: 'justice_1', type: 'agent' }];

      const report = detector.detect('Justice lifted the box', entities, acts, roles);

      const violation = report.getByType('selectional_violation')[0];
      expect(violation).toBeDefined();
      expect(violation.signal).toBe('abstract_physical_actor');
    })) passed++; else failed++;

    if (it('allows animate agent with intentional act', () => {
      const entities = [entity('doctor', 'doc_1'), entity('staff', 'staff_1')];
      const acts = [act('hired', { agent: 'doc_1', patient: 'staff_1', id: 'act_1' })];
      const roles = [{ act: 'act_1', entity: 'doc_1', type: 'agent' }];

      const report = detector.detect('The doctor hired staff', entities, acts, roles);

      const violations = report.getByType('selectional_violation');
      expect(violations).toHaveLength(0);
    })) passed++; else failed++;

    if (it('includes ontology constraint reference', () => {
      const entities = [entity('table', 'table_1'), entity('file', 'file_1')];
      const acts = [act('decide', { agent: 'table_1', id: 'act_1' })];
      const roles = [{ act: 'act_1', entity: 'table_1', type: 'agent' }];

      const report = detector.detect('The table decided', entities, acts, roles);

      const violation = report.getByType('selectional_violation')[0];
      expect(violation.ontologyConstraint).toBeDefined();
    })) passed++; else failed++;
  });

  describe('modal force ambiguity', () => {
    if (it('flags "should" as deontic/epistemic ambiguous', () => {
      const entities = [entity('doctor', 'doc_1')];
      const acts = [act('allocate', { modal: 'should', agent: 'doc_1', id: 'act_1' })];

      const report = detector.detect('The doctor should allocate', entities, acts, []);

      const modal = report.getByType('modal_force')[0];
      expect(modal).toBeDefined();
      expect(modal.modal).toBe('should');
      expect(modal.readings).toContain('obligation');
      expect(modal.readings).toContain('expectation');
    })) passed++; else failed++;

    if (it('flags "must" with deontic + epistemic readings', () => {
      const entities = [entity('patient', 'pat_1')];
      const acts = [act('arrive', { modal: 'must', id: 'act_1' })];

      const report = detector.detect('The patient must arrive', entities, acts, []);

      const modal = report.getByType('modal_force')[0];
      expect(modal.readings).toContain('obligation');
      expect(modal.readings).toContain('inference');
    })) passed++; else failed++;

    if (it('flags "may" with permission + possibility readings', () => {
      const entities = [entity('you', 'you_1')];
      const acts = [act('leave', { modal: 'may', agent: 'you_1', id: 'act_1' })];

      const report = detector.detect('You may leave', entities, acts, []);

      const modal = report.getByType('modal_force')[0];
      expect(modal.readings).toContain('permission');
      expect(modal.readings).toContain('possibility');
    })) passed++; else failed++;

    if (it('detects perfect aspect signal for epistemic reading', () => {
      const entities = [entity('patient', 'pat_1')];
      const acts = [act('arrive', {
        modal: 'must',
        id: 'act_1',
        tense: 'perfect',
        auxiliary: ['have']
      })];

      const report = detector.detect('The patient must have arrived', entities, acts, []);

      const modal = report.getByType('modal_force')[0];
      expect(modal.signals).toContain('perfect_aspect');
      expect(modal.defaultReading).toBe('inference');
    })) passed++; else failed++;

    if (it('detects agent subject signal for deontic reading', () => {
      const entities = [entity('doctor', 'doc_1')];
      const acts = [act('inform', { modal: 'should', agent: 'doc_1', id: 'act_1' })];
      const roles = [{ act: 'act_1', entity: 'doc_1', type: 'agent' }];

      const report = detector.detect('The doctor should inform', entities, acts, roles);

      const modal = report.getByType('modal_force')[0];
      expect(modal.signals).toContain('agent_subject');
      expect(modal.defaultReading).toBe('obligation');
    })) passed++; else failed++;

    if (it('detects second person subject signal', () => {
      const entities = [entity('you', 'you_1')];
      const acts = [act('submit', { modal: 'must', agent: 'you_1', id: 'act_1' })];
      const roles = [{ act: 'act_1', entity: 'you_1', type: 'agent' }];

      const report = detector.detect('You must submit', entities, acts, roles);

      const modal = report.getByType('modal_force')[0];
      expect(modal.signals).toContain('second_person_subject');
    })) passed++; else failed++;

    if (it('does not flag non-ambiguous modal "shall"', () => {
      const entities = [];
      const acts = [act('proceed', { modal: 'shall', id: 'act_1' })];

      const report = detector.detect('We shall proceed', entities, acts, []);

      // "shall" is not in ambiguousModals list, so should not be flagged
      const modals = report.getByType('modal_force');
      expect(modals).toHaveLength(0);
    })) passed++; else failed++;

    if (it('includes negation scope for negated modals', () => {
      const entities = [entity('you', 'you_1')];
      const acts = [act('leave', { modal: 'must', negated: true, id: 'act_1' })];

      const report = detector.detect('You must not leave', entities, acts, []);

      const modal = report.getByType('modal_force')[0];
      expect(modal.negationScope).toBe('under_modal');
    })) passed++; else failed++;
  });

  describe('scope ambiguity', () => {
    if (it('flags universal quantifier + negation', () => {
      const report = detector.detect('All doctors did not attend', [], [], []);

      const scope = report.getByType('scope')[0];
      expect(scope).toBeDefined();
      expect(scope.quantifier).toBe('all');
      expect(scope.negation).toBe('not');
      expect(scope.readings).toContain('wide');
      expect(scope.readings).toContain('narrow');
    })) passed++; else failed++;

    if (it('detects "not all" as wide scope', () => {
      const report = detector.detect('Not all patients received treatment', [], [], []);

      const scope = report.getByType('scope')[0];
      expect(scope.defaultReading).toBe('wide');
      expect(scope.confidence).toBe('high');
    })) passed++; else failed++;

    if (it('includes formalizations', () => {
      const report = detector.detect('Every patient was not examined', [], [], []);

      const scope = report.getByType('scope')[0];
      expect(scope.formalizations).toBeDefined();
      expect(scope.formalizations.wide).toBe('¬∀x.P(x)');
      expect(scope.formalizations.narrow).toBe('∀x.¬P(x)');
    })) passed++; else failed++;

    if (it('handles "every" quantifier', () => {
      const report = detector.detect('Every doctor did not respond', [], [], []);

      const scope = report.getByType('scope')[0];
      expect(scope.quantifier).toBe('every');
    })) passed++; else failed++;

    if (it('detects multiple quantifiers', () => {
      const report = detector.detect('Every doctor saw some patient', [], [], []);

      const scope = report.getByType('scope').find(s => s.quantifiers);
      expect(scope).toBeDefined();
      expect(scope.readings).toContain('subject_wide');
      expect(scope.readings).toContain('object_wide');
    })) passed++; else failed++;

    if (it('handles "may not" scope ambiguity', () => {
      const entities = [entity('you', 'you_1')];
      const acts = [act('leave', { modal: 'may', negated: true, id: 'act_1' })];

      const report = detector.detect('You may not leave', entities, acts, []);

      const scope = report.getByType('scope').find(s => s.modal === 'may');
      expect(scope).toBeDefined();
      expect(scope.readings).toContain('permission_denied');
      expect(scope.readings).toContain('possibility_denied');
    })) passed++; else failed++;
  });

  describe('metonymy detection', () => {
    if (it('flags "house" as potential metonymy when agent', () => {
      const entities = [entity('house', 'house_1')];
      const acts = [act('announce', { agent: 'house_1', id: 'act_1' })];
      const roles = [{ act: 'act_1', entity: 'house_1', type: 'agent' }];

      const report = detector.detect('The house announced', entities, acts, roles);

      const metonymy = report.getByType('potential_metonymy')[0];
      expect(metonymy).toBeDefined();
      expect(metonymy.signal).toBe('location_as_agent');
      expect(metonymy.suggestedReading).toBe('institution');
    })) passed++; else failed++;

    if (it('does not flag "house" when not agent', () => {
      const entities = [entity('house', 'house_1')];
      const acts = [act('build', { patient: 'house_1', id: 'act_1' })];
      const roles = [{ act: 'act_1', entity: 'house_1', type: 'patient' }];

      const report = detector.detect('They built the house', entities, acts, roles);

      const metonymies = report.getByType('potential_metonymy');
      expect(metonymies).toHaveLength(0);
    })) passed++; else failed++;
  });

  describe('overall detect method', () => {
    if (it('returns AmbiguityReport', () => {
      const report = detector.detect('The doctor should allocate resources', [], [], []);
      expect(report.constructor.name).toBe('AmbiguityReport');
    })) passed++; else failed++;

    if (it('handles empty input', () => {
      const report = detector.detect('', [], [], []);
      expect(report.hasAmbiguities()).toBeFalse();
    })) passed++; else failed++;

    if (it('detects multiple ambiguity types', () => {
      const entities = [
        entity('organization', 'org_1'),
        entity('resources', 'res_1')
      ];
      const acts = [act('allocate', { modal: 'should', agent: 'org_1', id: 'act_1' })];
      const roles = [{ act: 'act_1', entity: 'org_1', type: 'agent' }];

      const report = detector.detect(
        'The organization should allocate resources',
        entities, acts, roles
      );

      expect(report.getByType('noun_category').length).toBeGreaterThan(0);
      expect(report.getByType('modal_force').length).toBeGreaterThan(0);
    })) passed++; else failed++;
  });

});

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log(`  SUMMARY: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
