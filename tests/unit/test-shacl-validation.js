/**
 * Unit Tests for SHACL Validation (Week 3)
 *
 * Tests for SHMLValidator:
 * - Pattern 1: Information Staircase
 * - Pattern 2: Role Pattern
 * - Pattern 3: Designation Pattern
 * - Pattern 4: Temporal Interval Pattern
 * - Pattern 5: Measurement Pattern
 * - Pattern 6: Socio-Primal Pattern
 * - Pattern 7: Domain/Range Validation
 * - Pattern 8: Vocabulary Validation
 *
 * @version 4.0.0-phase4-week3
 */

const assert = require('assert');
const SHMLValidator = require('../../src/graph/SHMLValidator');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    testsPassed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    testsFailed++;
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${e.message}`);
  }
}

console.log('\n=== SHACL Validation Tests (Week 3) ===\n');

// ================================================================
// Basic Validator Tests
// ================================================================
console.log('Basic Validator');

const validator = new SHMLValidator();

test('validates empty graph as valid', () => {
  const result = validator.validate({ '@graph': [] });

  assert(result.valid === true, 'Empty graph should be valid');
  assert(result.complianceScore === 100, 'Empty graph should have 100% compliance');
});

test('returns proper result structure', () => {
  const result = validator.validate({ '@graph': [] });

  assert(Array.isArray(result.violations), 'Should have violations array');
  assert(Array.isArray(result.warnings), 'Should have warnings array');
  assert(Array.isArray(result.info), 'Should have info array');
  assert(typeof result.patterns === 'object', 'Should have patterns object');
  assert(typeof result.complianceScore === 'number', 'Should have compliance score');
});

test('summary contains node counts', () => {
  const graph = {
    '@graph': [
      { '@id': 'ex:Node1', '@type': ['owl:NamedIndividual'] },
      { '@id': 'ex:Node2', '@type': ['owl:NamedIndividual'] }
    ]
  };
  const result = validator.validate(graph);

  assert(result.summary.totalNodes === 2, 'Should count 2 nodes');
});

// ================================================================
// Pattern 1: Information Staircase Tests
// ================================================================
console.log('\nPattern 1: Information Staircase');

test('ICE with is_concretized_by passes', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:Autonomy_ICE_123',
        '@type': ['tagteam:EthicalValueICE', 'cco:InformationContentEntity'],
        'is_concretized_by': 'inst:Input_IBE_456'
      },
      {
        '@id': 'inst:Input_IBE_456',
        '@type': ['cco:InformationBearingEntity'],
        'cco:has_text_value': 'The doctor must decide...'
      }
    ]
  };

  const result = validator.validate(graph);

  assert(result.patterns.InformationStaircase.score === 100,
    'Should have 100% score for valid information staircase');
});

test('ICE without is_concretized_by generates warning', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:Orphan_ICE_123',
        '@type': ['cco:InformationContentEntity']
        // Missing is_concretized_by
      }
    ]
  };

  const result = validator.validate(graph);

  assert(result.warnings.length > 0, 'Should have warnings');
  assert(result.warnings.some(w => w.pattern === 'InformationStaircase'),
    'Should have InformationStaircase warning');
});

test('IBE without has_text_value generates warning', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:Empty_IBE_123',
        '@type': ['cco:InformationBearingEntity']
        // Missing has_text_value
      }
    ]
  };

  const result = validator.validate(graph);

  assert(result.warnings.some(w =>
    w.pattern === 'InformationStaircase' && w.message.includes('has_text_value')
  ), 'Should warn about missing has_text_value');
});

// ================================================================
// Pattern 2: Role Pattern Tests
// ================================================================
console.log('\nPattern 2: Role Pattern');

test('role with bearer passes', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:Doctor_0',
        '@type': ['cco:Agent', 'tagteam:DiscourseReferent'],
        'cco:is_bearer_of': 'inst:AgentRole_0'
      },
      {
        '@id': 'inst:AgentRole_0',
        '@type': ['bfo:BFO_0000023', 'bfo:Role'],
        'rdfs:label': 'AgentRole',
        'cco:realized_in': 'inst:Allocation_Act_0'
      },
      {
        '@id': 'inst:Allocation_Act_0',
        '@type': ['cco:IntentionalAct']
      }
    ]
  };

  const result = validator.validate(graph);

  assert(result.violations.length === 0 ||
    !result.violations.some(v => v.pattern === 'RolePattern'),
    'Should have no RolePattern violations');
});

test('role without bearer is VIOLATION', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:OrphanRole_0',
        '@type': ['bfo:BFO_0000023', 'cco:Role']
        // No bearer
      }
    ]
  };

  const result = validator.validate(graph);

  assert(result.violations.some(v =>
    v.pattern === 'RolePattern' && v.message.includes('no bearer')
  ), 'Should have VIOLATION for role without bearer');
  assert(result.valid === false, 'Graph should be invalid');
});

test('unrealized role generates warning', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:Doctor_0',
        '@type': ['cco:Agent'],
        'cco:is_bearer_of': 'inst:DormantRole_0'
      },
      {
        '@id': 'inst:DormantRole_0',
        '@type': ['bfo:BFO_0000023']
        // No realized_in
      }
    ]
  };

  const result = validator.validate(graph);

  assert(result.warnings.some(w =>
    w.pattern === 'RolePattern' && w.message.includes('not realized')
  ), 'Should warn about unrealized role');
});

// ================================================================
// Pattern 3: Designation Pattern Tests
// ================================================================
console.log('\nPattern 3: Designation Pattern');

test('designative ICE with designates passes', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:DoctorName_ICE',
        '@type': ['cco:DesignativeInformationContentEntity'],
        'cco:designates': 'inst:Doctor_0'
      },
      {
        '@id': 'inst:Doctor_0',
        '@type': ['cco:Person']
      }
    ]
  };

  const result = validator.validate(graph);

  assert(!result.violations.some(v => v.pattern === 'DesignationPattern'),
    'Should have no DesignationPattern violations');
});

test('designative ICE without designates is VIOLATION', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:EmptyName_ICE',
        '@type': ['cco:DesignativeInformationContentEntity']
        // No designates
      }
    ]
  };

  const result = validator.validate(graph);

  assert(result.violations.some(v =>
    v.pattern === 'DesignationPattern' && v.message.includes('does not designate')
  ), 'Should have VIOLATION for name without designatum');
});

// ================================================================
// Pattern 4: Temporal Interval Tests
// ================================================================
console.log('\nPattern 4: Temporal Interval Pattern');

test('valid temporal interval passes', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:TimeInterval_0',
        '@type': ['cco:TemporalInterval'],
        'cco:has_start_time': '2026-01-19T10:00:00Z',
        'cco:has_end_time': '2026-01-19T11:00:00Z'
      }
    ]
  };

  const result = validator.validate(graph);

  assert(result.patterns.TemporalIntervalPattern.score === 100,
    'Valid interval should score 100%');
});

test('backwards time interval is VIOLATION', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:BadInterval_0',
        '@type': ['cco:TemporalInterval'],
        'cco:has_start_time': '2026-01-19T12:00:00Z', // After end
        'cco:has_end_time': '2026-01-19T10:00:00Z'
      }
    ]
  };

  const result = validator.validate(graph);

  assert(result.violations.some(v =>
    v.pattern === 'TemporalIntervalPattern' && v.message.includes('backwards')
  ), 'Should have VIOLATION for backwards time');
});

test('missing start time generates warning', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:NoStart_0',
        '@type': ['cco:TemporalInterval'],
        'cco:has_end_time': '2026-01-19T11:00:00Z'
      }
    ]
  };

  const result = validator.validate(graph);

  assert(result.warnings.some(w =>
    w.pattern === 'TemporalIntervalPattern' && w.message.includes('no start time')
  ), 'Should warn about missing start time');
});

// ================================================================
// Pattern 5: Measurement Pattern Tests
// ================================================================
console.log('\nPattern 5: Measurement Pattern');

test('valid measurement passes', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:Urgency_Quality',
        '@type': ['bfo:BFO_0000019'],
        'cco:is_measured_by': 'inst:Urgency_Measurement'
      },
      {
        '@id': 'inst:Urgency_Measurement',
        '@type': ['cco:QualityMeasurement'],
        'cco:has_measurement_value': 0.85,
        'cco:uses_measurement_unit': 'inst:NormalizedScore_Unit'
      }
    ]
  };

  const result = validator.validate(graph);

  assert(!result.violations.some(v => v.pattern === 'MeasurementPattern'),
    'Valid measurement should have no violations');
});

test('measurement without value is VIOLATION', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:Empty_Measurement',
        '@type': ['cco:QualityMeasurement'],
        'cco:uses_measurement_unit': 'inst:Unit_0'
        // No value
      }
    ]
  };

  const result = validator.validate(graph);

  assert(result.violations.some(v =>
    v.pattern === 'MeasurementPattern' && v.message.includes('no value')
  ), 'Should have VIOLATION for measurement without value');
});

test('measurement without unit is VIOLATION', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:NoUnit_Measurement',
        '@type': ['cco:QualityMeasurement'],
        'cco:has_measurement_value': 0.5
        // No unit
      }
    ]
  };

  const result = validator.validate(graph);

  assert(result.violations.some(v =>
    v.pattern === 'MeasurementPattern' && v.message.includes('no unit')
  ), 'Should have VIOLATION for measurement without unit');
});

// ================================================================
// Pattern 6: Socio-Primal Pattern Tests
// ================================================================
console.log('\nPattern 6: Socio-Primal Pattern');

test('act with participant and temporal grounding passes', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:Allocation_Act_0',
        '@type': ['cco:IntentionalAct'],
        'cco:occurs_during': 'inst:TimeInterval_0',
        'cco:has_participant': 'inst:Doctor_0'
      },
      {
        '@id': 'inst:Doctor_0',
        '@type': ['cco:Agent']
      },
      {
        '@id': 'inst:TimeInterval_0',
        '@type': ['cco:TemporalInterval']
      }
    ]
  };

  const result = validator.validate(graph);

  assert(result.patterns.SocioPrimalPattern.score >= 50,
    'Act with participant and time should score well');
});

test('act without participant generates warning', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:Lonely_Act_0',
        '@type': ['cco:IntentionalAct']
        // No participant
      }
    ]
  };

  const result = validator.validate(graph);

  assert(result.warnings.some(w =>
    w.pattern === 'SocioPrimalPattern' && w.message.includes('no participant')
  ), 'Should warn about act without participant');
});

// ================================================================
// Pattern 7: Domain/Range Validation Tests
// ================================================================
console.log('\nPattern 7: Domain/Range Validation');

test('is_concretized_by with valid target passes', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:ICE_0',
        '@type': ['cco:InformationContentEntity'],
        'is_concretized_by': 'inst:IBE_0'
      },
      {
        '@id': 'inst:IBE_0',
        '@type': ['cco:InformationBearingEntity']
      }
    ]
  };

  const result = validator.validate(graph);

  assert(!result.warnings.some(w =>
    w.pattern === 'DomainRangeValidation' && w.message.includes('is_concretized_by')
  ), 'Valid concretization should not generate warning');
});

test('is_part_of linking Continuant to Process is VIOLATION', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:Person_0',
        '@type': ['cco:Person'],
        'cco:is_part_of': 'inst:Act_0'
      },
      {
        '@id': 'inst:Act_0',
        '@type': ['cco:IntentionalAct', 'bfo:BFO_0000015']
      }
    ]
  };

  const result = validator.validate(graph);

  assert(result.violations.some(v =>
    v.pattern === 'DomainRangeValidation' && v.message.includes('is_part_of')
  ), 'Continuant part_of Process should be VIOLATION');
});

// ================================================================
// Pattern 8: Vocabulary Validation Tests
// ================================================================
console.log('\nPattern 8: Vocabulary Validation');

test('known classes pass validation', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:Person_0',
        '@type': ['cco:Person', 'owl:NamedIndividual']
      }
    ]
  };

  const result = validator.validate(graph);

  assert(!result.warnings.some(w =>
    w.pattern === 'VocabularyValidation' && w.message.includes('cco:Person')
  ), 'Known class should not generate warning');
});

test('unknown class generates warning', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:Thing_0',
        '@type': ['cco:Persosn'] // Typo
      }
    ]
  };

  const result = validator.validate(graph);

  assert(result.warnings.some(w =>
    w.pattern === 'VocabularyValidation' && w.message.includes('Unknown class')
  ), 'Typo in class name should generate warning');
});

test('unknown predicate generates warning', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:Node_0',
        '@type': ['owl:NamedIndividual'],
        'tagteam:madeUpProperty': 'value'
      }
    ]
  };

  const result = validator.validate(graph);

  assert(result.warnings.some(w =>
    w.pattern === 'VocabularyValidation' && w.message.includes('Unknown predicate')
  ), 'Unknown predicate should generate warning');
});

// ================================================================
// Compliance Score Tests
// ================================================================
console.log('\nCompliance Score');

test('perfect graph has high compliance score', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:ICE_0',
        '@type': ['cco:InformationContentEntity'],
        'is_concretized_by': 'inst:IBE_0'
      },
      {
        '@id': 'inst:IBE_0',
        '@type': ['cco:InformationBearingEntity'],
        'cco:has_text_value': 'Some text'
      }
    ]
  };

  const result = validator.validate(graph);

  assert(result.complianceScore >= 80, 'Good graph should have high score');
});

test('violations reduce compliance score', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:OrphanRole_0',
        '@type': ['bfo:BFO_0000023'] // Role without bearer
      }
    ]
  };

  const result = validator.validate(graph);

  assert(result.complianceScore < 100, 'Violations should reduce score');
});

// ================================================================
// Strict Mode Tests
// ================================================================
console.log('\nStrict Mode');

test('strict mode treats warnings as violations', () => {
  const strictValidator = new SHMLValidator({ strict: true });

  const graph = {
    '@graph': [
      {
        '@id': 'inst:ICE_0',
        '@type': ['cco:InformationContentEntity']
        // Missing is_concretized_by (normally a warning)
      }
    ]
  };

  const result = strictValidator.validate(graph);

  assert(result.violations.length > 0, 'Strict mode should have violations');
  assert(result.valid === false, 'Graph should be invalid in strict mode');
});

// ================================================================
// Format Report Tests
// ================================================================
console.log('\nReport Formatting');

test('formatReport returns formatted string', () => {
  const graph = {
    '@graph': [
      {
        '@id': 'inst:Node_0',
        '@type': ['owl:NamedIndividual']
      }
    ]
  };

  const result = validator.validate(graph);
  const report = validator.formatReport(result);

  assert(typeof report === 'string', 'Report should be a string');
  assert(report.includes('SHML Validation Report'), 'Should have report header');
  assert(report.includes('Compliance Score'), 'Should show compliance score');
});

// ================================================================
// Integration Test
// ================================================================
console.log('\nIntegration Test');

test('validates realistic TagTeam graph', () => {
  const graph = {
    '@graph': [
      // IBE
      {
        '@id': 'inst:Input_Text_IBE_abc123',
        '@type': ['cco:InformationBearingEntity', 'owl:NamedIndividual'],
        'cco:has_text_value': 'The doctor must allocate the last ventilator',
        'tagteam:received_at': '2026-01-19T10:00:00Z'
      },
      // Parser Agent
      {
        '@id': 'inst:TagTeam_Parser_v4_0_0',
        '@type': ['cco:Agent', 'owl:NamedIndividual'],
        'tagteam:version': '4.0.0-phase4-week3'
      },
      // Value ICE
      {
        '@id': 'inst:Autonomy_ICE_def456',
        '@type': ['tagteam:EthicalValueICE', 'cco:InformationContentEntity', 'owl:NamedIndividual'],
        'is_concretized_by': 'inst:Input_Text_IBE_abc123',
        'tagteam:valueName': 'Autonomy'
      },
      // Value Assertion
      {
        '@id': 'inst:Autonomy_Assertion_ghi789',
        '@type': ['tagteam:ValueAssertionEvent', 'owl:NamedIndividual'],
        'tagteam:asserts': 'inst:Autonomy_ICE_def456',
        'tagteam:detected_by': 'inst:TagTeam_Parser_v4_0_0',
        'tagteam:based_on': 'inst:Input_Text_IBE_abc123',
        'tagteam:assertionType': 'tagteam:AutomatedDetection',
        'tagteam:validInContext': 'inst:MedicalEthics_Context',
        'tagteam:aggregateConfidence': 0.85
      },
      // Context
      {
        '@id': 'inst:MedicalEthics_Context',
        '@type': ['tagteam:InterpretationContext', 'owl:NamedIndividual'],
        'tagteam:framework': 'Principlism'
      }
    ]
  };

  const result = validator.validate(graph);

  assert(result.complianceScore >= 70, `Realistic graph should score >= 70%, got ${result.complianceScore}%`);
  assert(result.violations.length === 0, 'Realistic graph should have no violations');
});

// ================================================================
// Summary
// ================================================================
console.log('\n=== Test Summary ===');
console.log(`Total: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (testsFailed > 0) {
  process.exit(1);
}

console.log('\n✓ All SHACL validation tests passed!');
