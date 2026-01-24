/**
 * SelectionalPreferences Unit Tests - Phase 6.0
 *
 * Tests the centralized verb→argument requirements lookup table.
 */

const SelectionalPreferences = require('../../src/graph/SelectionalPreferences.js');

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
    toBeNull() {
      if (actual !== null) throw new Error(`Expected null but got ${actual}`);
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
    },
    toInclude(item) {
      if (!actual || (actual instanceof Set ? !actual.has(item) : !actual.includes(item))) {
        throw new Error(`Expected collection to include "${item}"`);
      }
    }
  };
}

let passed = 0;
let failed = 0;

const prefs = new SelectionalPreferences();

describe('SelectionalPreferences', () => {

  describe('verb classification', () => {
    if (it('classifies "decide" as intentional_mental', () => {
      expect(prefs.getVerbClass('decide')).toBe('intentional_mental');
    })) passed++; else failed++;

    if (it('classifies "lift" as intentional_physical', () => {
      expect(prefs.getVerbClass('lift')).toBe('intentional_physical');
    })) passed++; else failed++;

    if (it('classifies "announce" as communication', () => {
      expect(prefs.getVerbClass('announce')).toBe('communication');
    })) passed++; else failed++;

    if (it('classifies "allocate" as transfer', () => {
      expect(prefs.getVerbClass('allocate')).toBe('transfer');
    })) passed++; else failed++;

    if (it('classifies "hire" as employment', () => {
      expect(prefs.getVerbClass('hire')).toBe('employment');
    })) passed++; else failed++;

    if (it('classifies "govern" as governance', () => {
      expect(prefs.getVerbClass('govern')).toBe('governance');
    })) passed++; else failed++;

    if (it('classifies "create" as creation', () => {
      expect(prefs.getVerbClass('create')).toBe('creation');
    })) passed++; else failed++;

    if (it('classifies "see" as perception', () => {
      expect(prefs.getVerbClass('see')).toBe('perception');
    })) passed++; else failed++;

    if (it('classifies "be" as stative', () => {
      expect(prefs.getVerbClass('be')).toBe('stative');
    })) passed++; else failed++;

    if (it('returns null for unknown verbs', () => {
      expect(prefs.getVerbClass('flibbertigibbet')).toBeNull();
    })) passed++; else failed++;

    if (it('handles inflected forms (decided)', () => {
      expect(prefs.getVerbClass('decided')).toBe('intentional_mental');
    })) passed++; else failed++;

    if (it('handles -ing forms (deciding)', () => {
      expect(prefs.getVerbClass('deciding')).toBe('intentional_mental');
    })) passed++; else failed++;

    if (it('handles -s forms (decides)', () => {
      expect(prefs.getVerbClass('decides')).toBe('intentional_mental');
    })) passed++; else failed++;
  });

  describe('subject requirements', () => {
    if (it('intentional_mental allows animate and organization', () => {
      const req = prefs.getSubjectRequirement('decide');
      expect(req).toContain('animate');
      expect(req).toContain('organization');
    })) passed++; else failed++;

    if (it('intentional_physical allows only animate', () => {
      const req = prefs.getSubjectRequirement('lift');
      expect(req).toContain('animate');
      expect(req.length).toBe(1);
    })) passed++; else failed++;

    if (it('communication allows animate and organization', () => {
      const req = prefs.getSubjectRequirement('announce');
      expect(req).toContain('animate');
      expect(req).toContain('organization');
    })) passed++; else failed++;

    if (it('stative has no subject requirement', () => {
      const req = prefs.getSubjectRequirement('be');
      expect(req).toBeNull();
    })) passed++; else failed++;

    if (it('returns null for unknown verbs', () => {
      const req = prefs.getSubjectRequirement('nonexistent');
      expect(req).toBeNull();
    })) passed++; else failed++;
  });

  describe('agent validation - organizations', () => {
    if (it('allows organization agents for mental acts (decide)', () => {
      expect(prefs.isValidAgent('decide', 'committee')).toBeTrue();
    })) passed++; else failed++;

    if (it('allows organization agents for communication (announce)', () => {
      expect(prefs.isValidAgent('announce', 'hospital')).toBeTrue();
    })) passed++; else failed++;

    if (it('allows organization agents for transfer (allocate)', () => {
      expect(prefs.isValidAgent('allocate', 'board')).toBeTrue();
    })) passed++; else failed++;

    if (it('allows organization agents for employment (hire)', () => {
      expect(prefs.isValidAgent('hire', 'company')).toBeTrue();
    })) passed++; else failed++;

    if (it('allows organization agents for governance (regulate)', () => {
      expect(prefs.isValidAgent('regulate', 'government')).toBeTrue();
    })) passed++; else failed++;

    if (it('disallows organization agents for physical acts (lift)', () => {
      expect(prefs.isValidAgent('lift', 'committee')).toBeFalse();
    })) passed++; else failed++;

    if (it('disallows organization agents for perception (see)', () => {
      expect(prefs.isValidAgent('see', 'organization')).toBeFalse();
    })) passed++; else failed++;
  });

  describe('agent validation - animate entities', () => {
    if (it('allows animate agents for all intentional act classes', () => {
      expect(prefs.isValidAgent('decide', 'doctor')).toBeTrue();
      expect(prefs.isValidAgent('lift', 'person')).toBeTrue();
      expect(prefs.isValidAgent('announce', 'nurse')).toBeTrue();
      expect(prefs.isValidAgent('see', 'patient')).toBeTrue();
    })) passed++; else failed++;

    if (it('allows animate agents for physical acts', () => {
      expect(prefs.isValidAgent('run', 'person')).toBeTrue();
      expect(prefs.isValidAgent('throw', 'child')).toBeTrue();
    })) passed++; else failed++;
  });

  describe('agent validation - inanimate entities', () => {
    if (it('disallows inanimate agents for mental acts', () => {
      expect(prefs.isValidAgent('decide', 'rock')).toBeFalse();
    })) passed++; else failed++;

    if (it('disallows inanimate agents for communication', () => {
      expect(prefs.isValidAgent('announce', 'stone')).toBeFalse();
    })) passed++; else failed++;

    if (it('disallows inanimate agents for physical acts', () => {
      expect(prefs.isValidAgent('lift', 'table')).toBeFalse();
    })) passed++; else failed++;

    if (it('disallows material_entity agents for intentional acts', () => {
      expect(prefs.isValidAgent('decide', 'ventilator')).toBeFalse();
    })) passed++; else failed++;

    if (it('allows any agent for stative verbs (no restriction)', () => {
      expect(prefs.isValidAgent('be', 'rock')).toBeTrue();
      expect(prefs.isValidAgent('have', 'table')).toBeTrue();
    })) passed++; else failed++;
  });

  describe('entity categorization', () => {
    if (it('categorizes "committee" as organization', () => {
      expect(prefs.getEntityCategory('committee')).toBe('organization');
    })) passed++; else failed++;

    if (it('categorizes "hospital" as organization', () => {
      expect(prefs.getEntityCategory('hospital')).toBe('organization');
    })) passed++; else failed++;

    if (it('categorizes "board" as organization', () => {
      expect(prefs.getEntityCategory('board')).toBe('organization');
    })) passed++; else failed++;

    if (it('categorizes "council" as organization', () => {
      expect(prefs.getEntityCategory('council')).toBe('organization');
    })) passed++; else failed++;

    if (it('categorizes "rock" as inanimate', () => {
      expect(prefs.getEntityCategory('rock')).toBe('inanimate');
    })) passed++; else failed++;

    if (it('categorizes "doctor" as animate', () => {
      expect(prefs.getEntityCategory('doctor')).toBe('animate');
    })) passed++; else failed++;

    if (it('categorizes "patient" as animate', () => {
      expect(prefs.getEntityCategory('patient')).toBe('animate');
    })) passed++; else failed++;

    if (it('categorizes "ventilator" as material_entity', () => {
      expect(prefs.getEntityCategory('ventilator')).toBe('material_entity');
    })) passed++; else failed++;

    if (it('categorizes "justice" as abstract', () => {
      expect(prefs.getEntityCategory('justice')).toBe('abstract');
    })) passed++; else failed++;

    if (it('categorizes unknown words ending in -er as animate', () => {
      expect(prefs.getEntityCategory('investigator')).toBe('animate');
    })) passed++; else failed++;

    if (it('categorizes unknown words ending in -tion as abstract', () => {
      expect(prefs.getEntityCategory('deliberation')).toBe('abstract');
    })) passed++; else failed++;
  });

  describe('helper methods', () => {
    if (it('isAnimate returns true for persons', () => {
      expect(prefs.isAnimate('doctor')).toBeTrue();
      expect(prefs.isAnimate('person')).toBeTrue();
    })) passed++; else failed++;

    if (it('isAnimate returns false for organizations', () => {
      expect(prefs.isAnimate('committee')).toBeFalse();
    })) passed++; else failed++;

    if (it('isOrganization returns true for organizations', () => {
      expect(prefs.isOrganization('committee')).toBeTrue();
      expect(prefs.isOrganization('hospital')).toBeTrue();
    })) passed++; else failed++;

    if (it('isInanimate returns true for objects', () => {
      expect(prefs.isInanimate('rock')).toBeTrue();
      expect(prefs.isInanimate('ventilator')).toBeTrue();
    })) passed++; else failed++;

    if (it('isAbstract returns true for concepts', () => {
      expect(prefs.isAbstract('justice')).toBeTrue();
      expect(prefs.isAbstract('freedom')).toBeTrue();
    })) passed++; else failed++;
  });

  describe('getViolation', () => {
    if (it('returns violation for inanimate agent of mental act', () => {
      const violation = prefs.getViolation('decide', 'rock');
      expect(violation).toBeDefined();
      expect(violation.type).toBe('agent_violation');
      expect(violation.signal).toBe('inanimate_agent');
    })) passed++; else failed++;

    if (it('returns violation for organization agent of physical act', () => {
      const violation = prefs.getViolation('lift', 'committee');
      expect(violation).toBeDefined();
      expect(violation.type).toBe('agent_violation');
    })) passed++; else failed++;

    if (it('returns null for valid organization agent of mental act', () => {
      const violation = prefs.getViolation('decide', 'committee');
      expect(violation).toBeNull();
    })) passed++; else failed++;

    if (it('returns null for valid animate agent of physical act', () => {
      const violation = prefs.getViolation('lift', 'person');
      expect(violation).toBeNull();
    })) passed++; else failed++;

    if (it('includes ontology constraint in violation', () => {
      const violation = prefs.getViolation('decide', 'rock');
      expect(violation.ontologyConstraint).toBeDefined();
    })) passed++; else failed++;

    if (it('includes verb class in violation', () => {
      const violation = prefs.getViolation('decide', 'rock');
      expect(violation.verbClass).toBe('intentional_mental');
    })) passed++; else failed++;
  });

  describe('ontology types', () => {
    if (it('returns cco:MentalAct for mental verbs', () => {
      expect(prefs.getOntologyType('decide')).toBe('cco:MentalAct');
    })) passed++; else failed++;

    if (it('returns cco:PhysicalAct for physical verbs', () => {
      expect(prefs.getOntologyType('lift')).toBe('cco:PhysicalAct');
    })) passed++; else failed++;

    if (it('returns cco:CommunicativeAct for communication verbs', () => {
      expect(prefs.getOntologyType('announce')).toBe('cco:CommunicativeAct');
    })) passed++; else failed++;
  });

  describe('extensibility', () => {
    if (it('addVerb adds a verb to specified class', () => {
      const localPrefs = new SelectionalPreferences();
      expect(localPrefs.getVerbClass('ponder')).toBeNull();
      localPrefs.addVerb('ponder', 'intentional_mental');
      expect(localPrefs.getVerbClass('ponder')).toBe('intentional_mental');
    })) passed++; else failed++;

    if (it('addEntity adds an entity to specified category', () => {
      const localPrefs = new SelectionalPreferences();
      expect(localPrefs.getEntityCategory('robodog')).toBe('inanimate'); // default
      localPrefs.addEntity('robodog', 'animate');
      expect(localPrefs.getEntityCategory('robodog')).toBe('animate');
    })) passed++; else failed++;

    if (it('getVerbsInClass returns verbs for valid class', () => {
      const verbs = prefs.getVerbsInClass('intentional_mental');
      expect(verbs).toBeDefined();
      expect(verbs.has('decide')).toBeTrue();
    })) passed++; else failed++;

    if (it('getVerbsInClass returns null for invalid class', () => {
      const verbs = prefs.getVerbsInClass('nonexistent');
      expect(verbs).toBeNull();
    })) passed++; else failed++;

    if (it('getVerbClassNames returns all class names', () => {
      const names = prefs.getVerbClassNames();
      expect(names).toContain('intentional_mental');
      expect(names).toContain('intentional_physical');
      expect(names).toContain('communication');
    })) passed++; else failed++;

    if (it('getEntityCategoryNames returns all category names', () => {
      const names = prefs.getEntityCategoryNames();
      expect(names).toContain('animate');
      expect(names).toContain('organization');
      expect(names).toContain('inanimate');
    })) passed++; else failed++;
  });

  describe('critical Phase 6 acceptance criteria', () => {
    // 6.0.4: isValidAgent('decide', 'committee') returns true
    if (it('AC 6.0.4: isValidAgent("decide", "committee") returns true', () => {
      expect(prefs.isValidAgent('decide', 'committee')).toBeTrue();
    })) passed++; else failed++;

    // 6.0.5: isValidAgent('decide', 'rock') returns false
    if (it('AC 6.0.5: isValidAgent("decide", "rock") returns false', () => {
      expect(prefs.isValidAgent('decide', 'rock')).toBeFalse();
    })) passed++; else failed++;

    // 6.0.6: isValidAgent('lift', 'organization') returns false
    if (it('AC 6.0.6: isValidAgent("lift", "organization") returns false', () => {
      expect(prefs.isValidAgent('lift', 'organization')).toBeFalse();
    })) passed++; else failed++;

    // Additional critical test: hospital should be able to decide/announce
    if (it('hospital can decide (organization mental act)', () => {
      expect(prefs.isValidAgent('decide', 'hospital')).toBeTrue();
    })) passed++; else failed++;

    if (it('hospital can announce (organization communication)', () => {
      expect(prefs.isValidAgent('announce', 'hospital')).toBeTrue();
    })) passed++; else failed++;

    // Metonymic location patterns
    if (it('"house" is categorized as organization (metonymy support)', () => {
      expect(prefs.getEntityCategory('house')).toBe('organization');
    })) passed++; else failed++;

    if (it('"bench" is categorized as organization (metonymy support)', () => {
      expect(prefs.getEntityCategory('bench')).toBe('organization');
    })) passed++; else failed++;
  });

});

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log(`  SUMMARY: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
