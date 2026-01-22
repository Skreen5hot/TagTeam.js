/**
 * TagTeam Test Helpers
 *
 * Provides a minimal but powerful test framework with:
 * - Async/await support
 * - Rich assertions for semantic parsing
 * - Test grouping and filtering
 * - Skip/only modifiers
 *
 * @module tests/framework/test-helpers
 * @version 1.0.0
 */

const assert = require('assert');

// Track test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  pending: 0,
  tests: [],
  currentSuite: null
};

// Test filtering
let onlyMode = false;
const onlyTests = new Set();
const skipTests = new Set();

/**
 * Define a test suite (group of related tests)
 *
 * @param {string} name - Suite name
 * @param {Function} fn - Suite body containing tests
 */
function describe(name, fn) {
  const previousSuite = results.currentSuite;
  results.currentSuite = name;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📋 ${name}`);
  console.log(`${'═'.repeat(60)}`);

  fn();

  results.currentSuite = previousSuite;
}

/**
 * Define an individual test case
 *
 * @param {string} name - Test name
 * @param {Function} fn - Test body (synchronous)
 * @param {Object} [options] - Test options
 * @param {boolean} [options.skip] - Skip this test
 * @param {string[]} [options.tags] - Tags for filtering
 * @returns {Object} Test result
 */
function test(name, fn, options = {}) {
  const { skip = false, tags = [] } = options;

  const testId = `${results.currentSuite || 'root'}::${name}`;

  // Handle skip
  if (skip || skipTests.has(testId)) {
    console.log(`  ○ ${name} (skipped)`);
    results.skipped++;
    results.tests.push({ name, suite: results.currentSuite, status: 'skipped', tags });
    return { status: 'skipped', name };
  }

  // Handle only mode
  if (onlyMode && !onlyTests.has(testId)) {
    results.skipped++;
    return { status: 'skipped', name };
  }

  const startTime = Date.now();

  try {
    // Run synchronously
    fn();

    const duration = Date.now() - startTime;
    console.log(`  ✓ ${name} (${duration}ms)`);
    results.passed++;
    results.tests.push({ name, suite: results.currentSuite, status: 'passed', duration, tags });
    return { status: 'passed', name, duration };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    if (error.stack && process.env.VERBOSE) {
      console.log(`    Stack: ${error.stack.split('\n').slice(1, 3).join('\n    ')}`);
    }
    results.failed++;
    results.tests.push({ name, suite: results.currentSuite, status: 'failed', error: error.message, duration, tags });
    return { status: 'failed', name, error };
  }
}

/**
 * Skip a test (placeholder for future implementation)
 */
test.skip = function(name, fn, options = {}) {
  return test(name, fn, { ...options, skip: true });
};

/**
 * Mark test as pending (not yet implemented)
 */
test.todo = function(name) {
  console.log(`  ◌ ${name} (todo)`);
  results.pending++;
  results.tests.push({ name, suite: results.currentSuite, status: 'pending' });
  return { status: 'pending', name };
};

/**
 * Run only this test (for debugging)
 */
test.only = function(name, fn, options = {}) {
  onlyMode = true;
  const testId = `${results.currentSuite || 'root'}::${name}`;
  onlyTests.add(testId);
  return test(name, fn, options);
};

// ============================================================
// Assertion Helpers
// ============================================================

/**
 * Create an expect chain for value assertions
 *
 * @param {*} actual - Actual value to test
 * @returns {Object} Assertion chain
 */
function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },

    toEqual(expected) {
      assert.deepStrictEqual(actual, expected);
    },

    toBeGreaterThan(expected) {
      if (!(actual > expected)) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },

    toBeGreaterThanOrEqual(expected) {
      if (!(actual >= expected)) {
        throw new Error(`Expected ${actual} to be >= ${expected}`);
      }
    },

    toBeLessThan(expected) {
      if (!(actual < expected)) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },

    toBeLessThanOrEqual(expected) {
      if (!(actual <= expected)) {
        throw new Error(`Expected ${actual} to be <= ${expected}`);
      }
    },

    toContain(expected) {
      if (Array.isArray(actual)) {
        if (!actual.includes(expected)) {
          throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
        }
      } else if (typeof actual === 'string') {
        if (!actual.includes(expected)) {
          throw new Error(`Expected string to contain "${expected}"`);
        }
      } else {
        throw new Error('toContain only works on arrays and strings');
      }
    },

    toHaveLength(expected) {
      if (actual.length !== expected) {
        throw new Error(`Expected length ${expected}, got ${actual.length}`);
      }
    },

    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value, got ${actual}`);
      }
    },

    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy value, got ${actual}`);
      }
    },

    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null, got ${actual}`);
      }
    },

    toBeUndefined() {
      if (actual !== undefined) {
        throw new Error(`Expected undefined, got ${actual}`);
      }
    },

    toBeDefined() {
      if (actual === undefined) {
        throw new Error('Expected value to be defined');
      }
    },

    toBeInstanceOf(expectedClass) {
      if (!(actual instanceof expectedClass)) {
        throw new Error(`Expected instance of ${expectedClass.name}`);
      }
    },

    toThrow(expectedMessage) {
      let threw = false;
      let thrownError;
      try {
        actual();
      } catch (e) {
        threw = true;
        thrownError = e;
      }
      if (!threw) {
        throw new Error('Expected function to throw');
      }
      if (expectedMessage && !thrownError.message.includes(expectedMessage)) {
        throw new Error(`Expected error message to include "${expectedMessage}", got "${thrownError.message}"`);
      }
    },

    toMatch(pattern) {
      if (!pattern.test(actual)) {
        throw new Error(`Expected "${actual}" to match ${pattern}`);
      }
    },

    // Negation
    not: {
      toBe(expected) {
        if (actual === expected) {
          throw new Error(`Expected ${JSON.stringify(actual)} not to be ${JSON.stringify(expected)}`);
        }
      },
      toContain(expected) {
        if (Array.isArray(actual) && actual.includes(expected)) {
          throw new Error(`Expected array not to contain ${JSON.stringify(expected)}`);
        }
        if (typeof actual === 'string' && actual.includes(expected)) {
          throw new Error(`Expected string not to contain "${expected}"`);
        }
      },
      toBeNull() {
        if (actual === null) {
          throw new Error('Expected value not to be null');
        }
      },
      toBeUndefined() {
        if (actual === undefined) {
          throw new Error('Expected value not to be undefined');
        }
      }
    }
  };
}

// ============================================================
// Semantic Parsing Assertions
// ============================================================

/**
 * Semantic assertions for TagTeam graph output
 */
const semantic = {
  /**
   * Assert node has expected BFO/CCO type
   */
  hasType(node, expectedType) {
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
    if (!types.some(t => t === expectedType || t.endsWith(`:${expectedType}`))) {
      throw new Error(`Expected type "${expectedType}", got [${types.join(', ')}]`);
    }
  },

  /**
   * Assert node does NOT have a type
   */
  lacksType(node, unexpectedType) {
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
    if (types.some(t => t === unexpectedType || t.endsWith(`:${unexpectedType}`))) {
      throw new Error(`Expected NOT to have type "${unexpectedType}"`);
    }
  },

  /**
   * Find node in graph by predicate
   */
  findNode(graph, predicate) {
    const nodes = graph['@graph'] || graph.nodes || graph;
    const nodesArray = Array.isArray(nodes) ? nodes : [nodes];
    return nodesArray.find(predicate);
  },

  /**
   * Assert graph contains a node matching predicate
   */
  containsNode(graph, predicate, description = 'matching node') {
    const found = semantic.findNode(graph, predicate);
    if (!found) {
      throw new Error(`Expected graph to contain ${description}`);
    }
    return found;
  },

  /**
   * Get all nodes of a specific type
   */
  getNodesOfType(graph, type) {
    const nodes = graph['@graph'] || graph.nodes || graph;
    const nodesArray = Array.isArray(nodes) ? nodes : [nodes];
    return nodesArray.filter(n => {
      const types = Array.isArray(n['@type']) ? n['@type'] : [n['@type']];
      return types.some(t => t === type || t.includes(type));
    });
  },

  /**
   * Assert relation exists between nodes
   */
  hasRelation(graph, subjectId, predicate, objectId) {
    const nodes = graph['@graph'] || graph.nodes || graph;
    const nodesArray = Array.isArray(nodes) ? nodes : [nodes];
    const subject = nodesArray.find(n => n['@id'] === subjectId);

    if (!subject) {
      throw new Error(`Subject node "${subjectId}" not found`);
    }

    const value = subject[predicate];
    if (!value) {
      throw new Error(`Predicate "${predicate}" not found on subject`);
    }

    const targetId = value?.['@id'] || value;
    const targetIds = Array.isArray(targetId) ? targetId.map(t => t?.['@id'] || t) : [targetId];

    if (!targetIds.includes(objectId)) {
      throw new Error(`Expected ${predicate} to include "${objectId}", got [${targetIds.join(', ')}]`);
    }
  },

  /**
   * Assert property has expected value
   */
  hasProperty(node, property, expectedValue) {
    const actual = node[property];
    if (actual === undefined) {
      throw new Error(`Property "${property}" not found on node`);
    }
    if (expectedValue !== undefined && actual !== expectedValue) {
      throw new Error(`Expected ${property} to be "${expectedValue}", got "${actual}"`);
    }
    return actual;
  },

  /**
   * Assert node has valid IRI
   */
  hasValidIRI(node) {
    const id = node['@id'];
    if (!id) {
      throw new Error('Node has no @id');
    }
    if (!id.includes(':')) {
      throw new Error(`Invalid IRI format: "${id}" (expected prefix:localname)`);
    }
  },

  /**
   * Assert SHACL validation passes
   */
  passesSHACLValidation(graph, options = {}) {
    const SHMLValidator = require('../../src/graph/SHMLValidator');
    const validator = new SHMLValidator(options);

    // Parse if string
    const graphObj = typeof graph === 'string' ? JSON.parse(graph) : graph;
    const result = validator.validate(graphObj);

    if (!result.valid) {
      const violations = result.violations.slice(0, 5).map(v => `  - ${v.message}`).join('\n');
      throw new Error(`SHACL validation failed (${result.violations.length} violations):\n${violations}`);
    }

    return result;
  },

  /**
   * Assert actuality status
   */
  hasActualityStatus(node, expectedStatus) {
    const status = node['tagteam:actualityStatus'];
    if (!status) {
      throw new Error('Node has no actualityStatus');
    }
    const normalizedExpected = expectedStatus.includes(':') ? expectedStatus : `tagteam:${expectedStatus}`;
    if (status !== normalizedExpected) {
      throw new Error(`Expected actualityStatus "${normalizedExpected}", got "${status}"`);
    }
  },

  /**
   * Assert denotesType
   */
  denotesType(node, expectedType) {
    const type = node['tagteam:denotesType'];
    if (!type) {
      throw new Error('Node has no denotesType');
    }
    if (type !== expectedType) {
      throw new Error(`Expected denotesType "${expectedType}", got "${type}"`);
    }
  }
};

// ============================================================
// Fixture Helpers
// ============================================================

/**
 * Load test corpus from JSON file
 */
function loadCorpus(filename) {
  const fs = require('fs');
  const path = require('path');

  // Try multiple locations
  const locations = [
    path.join(__dirname, '..', '..', 'iee-collaboration', 'from-iee', 'data', filename),
    path.join(__dirname, '..', 'fixtures', filename),
    path.join(__dirname, '..', '..', 'data', filename)
  ];

  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      return JSON.parse(fs.readFileSync(loc, 'utf-8'));
    }
  }

  throw new Error(`Corpus file not found: ${filename}`);
}

/**
 * Create a fresh SemanticGraphBuilder instance
 */
function createGraphBuilder() {
  const SemanticGraphBuilder = require('../../src/graph/SemanticGraphBuilder');
  return new SemanticGraphBuilder();
}

/**
 * Parse text and return JSON-LD graph
 */
function parseToGraph(text, options = {}) {
  const builder = createGraphBuilder();
  const rawGraph = builder.build(text, options);

  const JSONLDSerializer = require('../../src/graph/JSONLDSerializer');
  const serializer = new JSONLDSerializer();
  const jsonldStr = serializer.serialize(rawGraph);

  return JSON.parse(jsonldStr);
}

// ============================================================
// Summary & Reporting
// ============================================================

/**
 * Print test summary
 */
function printSummary() {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Test Summary');
  console.log('═'.repeat(60));

  const total = results.passed + results.failed + results.skipped + results.pending;

  console.log(`  Total:    ${total}`);
  console.log(`  ✓ Passed:  ${results.passed}`);
  console.log(`  ✗ Failed:  ${results.failed}`);
  console.log(`  ○ Skipped: ${results.skipped}`);
  console.log(`  ◌ Pending: ${results.pending}`);

  const passRate = total > 0 ? ((results.passed / (results.passed + results.failed)) * 100).toFixed(1) : 100;
  console.log(`\n  Pass Rate: ${passRate}%`);

  if (results.failed > 0) {
    console.log('\n  Failed Tests:');
    results.tests
      .filter(t => t.status === 'failed')
      .forEach(t => console.log(`    - ${t.suite}::${t.name}: ${t.error}`));
  }

  console.log('═'.repeat(60) + '\n');

  return results;
}

/**
 * Get results for programmatic use
 */
function getResults() {
  return { ...results };
}

/**
 * Reset results (for multiple test file runs)
 */
function resetResults() {
  results.passed = 0;
  results.failed = 0;
  results.skipped = 0;
  results.pending = 0;
  results.tests = [];
  results.currentSuite = null;
  onlyMode = false;
  onlyTests.clear();
  skipTests.clear();
}

/**
 * Exit with appropriate code
 */
function exit() {
  process.exit(results.failed > 0 ? 1 : 0);
}

module.exports = {
  describe,
  test,
  expect,
  semantic,
  loadCorpus,
  createGraphBuilder,
  parseToGraph,
  printSummary,
  getResults,
  resetResults,
  exit
};
