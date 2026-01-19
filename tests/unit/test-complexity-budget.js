/**
 * Unit Tests for Complexity Budget (Week 3)
 *
 * Tests for ComplexityBudget:
 * - Node counting and limits
 * - Referent/assertion specific limits
 * - Text length limits
 * - Parse time limits
 * - Chunking functionality
 * - Error handling
 *
 * @version 4.0.0-phase4-week3
 */

const assert = require('assert');
const ComplexityBudget = require('../../src/graph/ComplexityBudget');

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

console.log('\n=== Complexity Budget Tests (Week 3) ===\n');

// ================================================================
// Basic Budget Tests
// ================================================================
console.log('Basic Budget');

test('creates budget with default limits', () => {
  const budget = new ComplexityBudget();

  assert(budget.maxNodes === 200, 'Default max nodes should be 200');
  assert(budget.maxReferents === 30, 'Default max referents should be 30');
  assert(budget.maxAssertions === 50, 'Default max assertions should be 50');
  assert(budget.maxTextLength === 2000, 'Default max text length should be 2000');
  assert(budget.maxParseTime === 500, 'Default max parse time should be 500ms');
});

test('creates budget with custom limits', () => {
  const budget = new ComplexityBudget({
    maxNodes: 100,
    maxReferents: 15,
    maxAssertions: 25,
    maxTextLength: 1000,
    maxParseTime: 250
  });

  assert(budget.maxNodes === 100, 'Custom max nodes');
  assert(budget.maxReferents === 15, 'Custom max referents');
  assert(budget.maxAssertions === 25, 'Custom max assertions');
  assert(budget.maxTextLength === 1000, 'Custom max text length');
  assert(budget.maxParseTime === 250, 'Custom max parse time');
});

test('resets counters correctly', () => {
  const budget = new ComplexityBudget();

  budget.addNode('DiscourseReferent');
  budget.addNode('ValueAssertionEvent');

  assert(budget.nodeCount === 2, 'Should have 2 nodes');

  budget.reset();

  assert(budget.nodeCount === 0, 'Node count should be 0 after reset');
  assert(budget.referentCount === 0, 'Referent count should be 0 after reset');
  assert(budget.assertionCount === 0, 'Assertion count should be 0 after reset');
});

// ================================================================
// Node Counting Tests
// ================================================================
console.log('\nNode Counting');

test('adds nodes and increments count', () => {
  const budget = new ComplexityBudget();

  budget.addNode('owl:NamedIndividual');
  budget.addNode('owl:NamedIndividual');

  assert(budget.nodeCount === 2, 'Should have 2 nodes');
});

test('tracks referent nodes separately', () => {
  const budget = new ComplexityBudget();

  budget.addNode('DiscourseReferent');
  budget.addNode('cco:Person');
  budget.addNode('cco:Agent');
  budget.addNode('owl:NamedIndividual');

  assert(budget.nodeCount === 4, 'Should have 4 total nodes');
  assert(budget.referentCount === 3, 'Should have 3 referents');
});

test('tracks assertion nodes separately', () => {
  const budget = new ComplexityBudget();

  budget.addNode('ValueAssertionEvent');
  budget.addNode('ContextAssessmentEvent');
  budget.addNode('tagteam:AssertionEvent');
  budget.addNode('owl:NamedIndividual');

  assert(budget.nodeCount === 4, 'Should have 4 total nodes');
  assert(budget.assertionCount === 3, 'Should have 3 assertions');
});

test('addNodes adds multiple nodes', () => {
  const budget = new ComplexityBudget();

  const added = budget.addNodes([
    'DiscourseReferent',
    'ValueAssertionEvent',
    'owl:NamedIndividual'
  ]);

  assert(added === 3, 'Should add 3 nodes');
  assert(budget.nodeCount === 3, 'Should have 3 nodes');
});

// ================================================================
// Budget Limit Tests
// ================================================================
console.log('\nBudget Limits');

test('throws when max nodes exceeded', () => {
  const budget = new ComplexityBudget({ maxNodes: 3, throwOnExceed: true });

  budget.addNode('node1');
  budget.addNode('node2');
  budget.addNode('node3');

  let threw = false;
  try {
    budget.addNode('node4');
  } catch (e) {
    threw = true;
    assert(e.name === 'ComplexityBudgetError', 'Should be ComplexityBudgetError');
    assert(e.type === 'MAX_NODES', 'Should be MAX_NODES error type');
  }

  assert(threw, 'Should throw when max nodes exceeded');
});

test('throws when max referents exceeded', () => {
  const budget = new ComplexityBudget({ maxReferents: 2, throwOnExceed: true });

  budget.addNode('DiscourseReferent');
  budget.addNode('cco:Person');

  let threw = false;
  try {
    budget.addNode('cco:Agent');
  } catch (e) {
    threw = true;
    assert(e.type === 'MAX_REFERENTS', 'Should be MAX_REFERENTS error type');
  }

  assert(threw, 'Should throw when max referents exceeded');
});

test('throws when max assertions exceeded', () => {
  const budget = new ComplexityBudget({ maxAssertions: 2, throwOnExceed: true });

  budget.addNode('ValueAssertionEvent');
  budget.addNode('ContextAssessmentEvent');

  let threw = false;
  try {
    budget.addNode('tagteam:AssertionEvent');
  } catch (e) {
    threw = true;
    assert(e.type === 'MAX_ASSERTIONS', 'Should be MAX_ASSERTIONS error type');
  }

  assert(threw, 'Should throw when max assertions exceeded');
});

test('no throw when throwOnExceed is false', () => {
  const budget = new ComplexityBudget({ maxNodes: 2, throwOnExceed: false });

  budget.addNode('node1');
  budget.addNode('node2');

  let threw = false;
  try {
    const result = budget.addNode('node3');
    assert(result === false, 'Should return false when exceeded');
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'Should not throw when throwOnExceed is false');
  assert(budget.exceeded === true, 'Should mark exceeded');
  assert(budget.truncated === true, 'Should mark truncated');
});

// ================================================================
// Text Length Tests
// ================================================================
console.log('\nText Length');

test('checkTextLength passes for valid text', () => {
  const budget = new ComplexityBudget({ maxTextLength: 100 });

  const result = budget.checkTextLength('Short text');

  assert(result === true, 'Should pass for short text');
  assert(budget.textLength === 10, 'Should track text length');
});

test('checkTextLength throws for long text', () => {
  const budget = new ComplexityBudget({ maxTextLength: 10, throwOnExceed: true });

  let threw = false;
  try {
    budget.checkTextLength('This is a much longer text that exceeds the limit');
  } catch (e) {
    threw = true;
    assert(e.type === 'MAX_TEXT_LENGTH', 'Should be MAX_TEXT_LENGTH error');
  }

  assert(threw, 'Should throw for long text');
});

test('checkTextLength returns false when throwOnExceed is false', () => {
  const budget = new ComplexityBudget({ maxTextLength: 10, throwOnExceed: false });

  const result = budget.checkTextLength('This is a much longer text');

  assert(result === false, 'Should return false for long text');
  assert(budget.exceeded === true, 'Should mark exceeded');
});

// ================================================================
// Usage Statistics Tests
// ================================================================
console.log('\nUsage Statistics');

test('getUsage returns correct statistics', () => {
  const budget = new ComplexityBudget({ maxNodes: 100, maxReferents: 10, maxAssertions: 20 });

  budget.addNode('DiscourseReferent');
  budget.addNode('ValueAssertionEvent');
  budget.addNode('owl:NamedIndividual');

  const usage = budget.getUsage();

  assert(usage.nodes.current === 3, 'Should have 3 nodes');
  assert(usage.nodes.max === 100, 'Max nodes should be 100');
  assert(usage.nodes.percentage === 3, 'Percentage should be 3%');

  assert(usage.referents.current === 1, 'Should have 1 referent');
  assert(usage.referents.percentage === 10, 'Referent percentage should be 10%');

  assert(usage.assertions.current === 1, 'Should have 1 assertion');
  assert(usage.assertions.percentage === 5, 'Assertion percentage should be 5%');
});

test('getRemaining returns correct values', () => {
  const budget = new ComplexityBudget({ maxNodes: 100, maxReferents: 30 });

  budget.addNode('DiscourseReferent');
  budget.addNode('DiscourseReferent');

  const remaining = budget.getRemaining();

  assert(remaining.nodes === 98, 'Should have 98 nodes remaining');
  assert(remaining.referents === 28, 'Should have 28 referents remaining');
});

test('wasTruncated returns correct status', () => {
  const budget = new ComplexityBudget({ maxNodes: 2, throwOnExceed: false });

  assert(budget.wasTruncated() === false, 'Should not be truncated initially');

  budget.addNode('node1');
  budget.addNode('node2');
  budget.addNode('node3'); // Exceeds

  assert(budget.wasTruncated() === true, 'Should be truncated after exceeding');
});

// ================================================================
// Chunking Tests
// ================================================================
console.log('\nChunking');

test('estimateChunking returns needsChunking false for short text', () => {
  const budget = new ComplexityBudget({ maxTextLength: 1000 });

  const result = budget.estimateChunking('Short text');

  assert(result.needsChunking === false, 'Short text should not need chunking');
  assert(result.chunks === 1, 'Should be 1 chunk');
});

test('estimateChunking returns needsChunking true for long text', () => {
  const budget = new ComplexityBudget({ maxTextLength: 100 });
  const longText = 'A'.repeat(250);

  const result = budget.estimateChunking(longText);

  assert(result.needsChunking === true, 'Long text should need chunking');
  assert(result.chunks === 3, 'Should estimate 3 chunks');
  assert(result.recommendation.includes('250'), 'Should mention text length');
});

test('chunkText returns single chunk for short text', () => {
  const budget = new ComplexityBudget({ maxTextLength: 1000 });

  const chunks = budget.chunkText('Short text');

  assert(chunks.length === 1, 'Should have 1 chunk');
  assert(chunks[0].text === 'Short text', 'Chunk should contain full text');
  assert(chunks[0].index === 0, 'Index should be 0');
});

test('chunkText splits on sentence boundaries', () => {
  const budget = new ComplexityBudget();

  const text = 'First sentence. Second sentence. Third sentence.';
  const chunks = budget.chunkText(text, { maxChars: 25 });

  assert(chunks.length > 1, 'Should split into multiple chunks');
  assert(chunks.every(c => c.text.endsWith('.') || c.text === chunks[chunks.length - 1].text),
    'Chunks should end on sentence boundaries');
});

test('chunkText includes offset information', () => {
  const budget = new ComplexityBudget();

  const text = 'First sentence. Second sentence.';
  const chunks = budget.chunkText(text, { maxChars: 20 });

  assert(chunks[0].startOffset === 0, 'First chunk starts at 0');
  assert(chunks[0].endOffset > 0, 'First chunk has end offset');

  if (chunks.length > 1) {
    assert(chunks[1].startOffset === chunks[0].endOffset,
      'Second chunk starts where first ends');
  }
});

test('chunkText without sentence preservation', () => {
  const budget = new ComplexityBudget();

  const text = 'A'.repeat(25);
  const chunks = budget.chunkText(text, { maxChars: 10, preserveSentences: false });

  assert(chunks.length === 3, 'Should have 3 chunks');
  assert(chunks[0].text.length === 10, 'First chunk should be 10 chars');
  assert(chunks[1].text.length === 10, 'Second chunk should be 10 chars');
  assert(chunks[2].text.length === 5, 'Third chunk should be 5 chars');
});

// ================================================================
// Metadata Tests
// ================================================================
console.log('\nMetadata');

test('getMetadata returns budget usage', () => {
  const budget = new ComplexityBudget();

  budget.addNode('DiscourseReferent');
  budget.addNode('ValueAssertionEvent');

  const metadata = budget.getMetadata();

  assert(metadata['tagteam:budgetUsage'].nodes === 2, 'Should track nodes');
  assert(metadata['tagteam:budgetUsage'].referents === 1, 'Should track referents');
  assert(metadata['tagteam:budgetUsage'].assertions === 1, 'Should track assertions');
  assert(metadata['tagteam:truncated'] === false, 'Should not be truncated');
});

test('getMetadata includes warnings when exceeded', () => {
  const budget = new ComplexityBudget({ maxNodes: 2, throwOnExceed: false });

  budget.addNode('node1');
  budget.addNode('node2');
  budget.addNode('node3'); // Exceeds

  const metadata = budget.getMetadata();

  assert(metadata['tagteam:truncated'] === true, 'Should be truncated');
  assert(metadata['tagteam:budgetWarnings'].length > 0, 'Should have warnings');
});

// ================================================================
// Parse Time Tests
// ================================================================
console.log('\nParse Time');

test('startParse initializes timer', () => {
  const budget = new ComplexityBudget();

  assert(budget.startTime === null, 'Timer should be null initially');

  budget.startParse();

  assert(budget.startTime !== null, 'Timer should be set after startParse');
});

test('getUsage includes parse time', () => {
  const budget = new ComplexityBudget();

  budget.startParse();

  // Small delay to ensure some time passes
  const start = Date.now();
  while (Date.now() - start < 5) { } // Wait ~5ms

  const usage = budget.getUsage();

  assert(usage.parseTime.current >= 0, 'Parse time should be tracked');
  assert(usage.parseTime.max === 500, 'Max parse time should be 500ms');
});

// ================================================================
// Edge Cases
// ================================================================
console.log('\nEdge Cases');

test('handles null node type', () => {
  const budget = new ComplexityBudget();

  budget.addNode(null);

  assert(budget.nodeCount === 1, 'Should count node');
  assert(budget.referentCount === 0, 'Should not count as referent');
  assert(budget.assertionCount === 0, 'Should not count as assertion');
});

test('handles empty node type', () => {
  const budget = new ComplexityBudget();

  budget.addNode('');

  assert(budget.nodeCount === 1, 'Should count node');
});

test('canAddNode returns false when exceeded', () => {
  const budget = new ComplexityBudget({ maxNodes: 1, throwOnExceed: false });

  budget.addNode('node1');
  const canAdd = budget.canAddNode('node2');

  assert(canAdd === false, 'canAddNode should return false');
});

test('error includes budget usage', () => {
  const budget = new ComplexityBudget({ maxNodes: 1, throwOnExceed: true });

  budget.addNode('node1');

  let error = null;
  try {
    budget.addNode('node2');
  } catch (e) {
    error = e;
  }

  assert(error.budget !== undefined, 'Error should include budget');
  assert(error.budget.nodes.current === 1, 'Budget should show current nodes');
});

// ================================================================
// BudgetError Constants
// ================================================================
console.log('\nBudgetError Constants');

test('BudgetError constants are exported', () => {
  assert(ComplexityBudget.BudgetError.MAX_NODES === 'MAX_NODES', 'Should have MAX_NODES');
  assert(ComplexityBudget.BudgetError.MAX_REFERENTS === 'MAX_REFERENTS', 'Should have MAX_REFERENTS');
  assert(ComplexityBudget.BudgetError.MAX_ASSERTIONS === 'MAX_ASSERTIONS', 'Should have MAX_ASSERTIONS');
  assert(ComplexityBudget.BudgetError.MAX_TEXT_LENGTH === 'MAX_TEXT_LENGTH', 'Should have MAX_TEXT_LENGTH');
  assert(ComplexityBudget.BudgetError.MAX_PARSE_TIME === 'MAX_PARSE_TIME', 'Should have MAX_PARSE_TIME');
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

console.log('\n✓ All complexity budget tests passed!');
