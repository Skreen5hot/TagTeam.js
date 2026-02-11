const res = require('./results/latest-results.json');
const testId = process.argv[2] || 'roles-recipient-001';

const test = res.results.find(r => r.id === testId);
if (!test) {
  console.log('Test not found:', testId);
  process.exit(1);
}

console.log('TEST:', test.id);
console.log('INPUT:', test.input);
console.log('PASSED:', test.passed);

if (test.semanticValidation) {
  console.log('\nEXPECTED ROLES:');
  test.semanticValidation.expectedRoles.forEach(r => {
    console.log(`  ${r.role}: "${r.text}"`);
  });

  console.log('\nEXTRACTED ROLES:');
  test.semanticValidation.extractedRoles.forEach(r => {
    console.log(`  ${r.role}: "${r.text}"`);
  });

  console.log('\nDIFFS:');
  test.semanticValidation.diffs.forEach(d => {
    if (d.type === 'missing-role') {
      console.log(`  MISSING: ${d.expected.role} - "${d.expected.text}"`);
    } else {
      console.log(`  EXTRA: ${d.actual.role} - "${d.actual.text}"`);
    }
  });
}
