const text = "I discovered that my company is falsifying safety reports";
const keyword = "falsifying";

// Test 1: Direct test
console.log('=== Direct Tests ===');
console.log('Text:', text);
console.log('Contains falsifying (includes):', text.includes('falsifying'));
console.log('Contains falsifying (lowercase includes):', text.toLowerCase().includes('falsifying'));

// Test 2: Word boundary regex
console.log('\n=== Word Boundary Regex ===');
const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
console.log('Escaped keyword:', escaped);

const regex1 = new RegExp('\\b' + escaped + '\\b', 'i');
console.log('Regex pattern:', regex1.toString());
console.log('Test on original text:', regex1.test(text));
console.log('Test on lowercase text:', regex1.test(text.toLowerCase()));

// Test 3: Manual regex
const regex2 = /\bfalsifying\b/i;
console.log('\n=== Manual Regex ===');
console.log('Manual regex:', regex2.toString());
console.log('Test on original:', regex2.test(text));
console.log('Match result:', text.match(regex2));

// Test 4: From PatternMatcher source
console.log('\n=== PatternMatcher Logic ===');
const lowerText = text.toLowerCase();
const lowerKeyword = keyword.toLowerCase();
const pattern = new RegExp('\\b' + lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
console.log('Pattern:', pattern.toString());
console.log('Result:', pattern.test(lowerText));
