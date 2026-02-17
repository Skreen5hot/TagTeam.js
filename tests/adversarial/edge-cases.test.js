#!/usr/bin/env node
/**
 * AC-4.4 through AC-4.7: Adversarial & Edge Case Tests
 *
 * Source: Major-Refactor-Roadmap.md Phase 4
 * Authority: OWASP, Unicode Consortium, UD v2
 *
 * Tests 130 adversarial sentences through the tree pipeline.
 * Each test asserts: no crash, valid @graph array, JSON-serializable.
 */

'use strict';

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '../..');

// Load pipeline modules
const SemanticGraphBuilder = require(path.join(ROOT, 'src/graph/SemanticGraphBuilder'));
const PerceptronTagger = require(path.join(ROOT, 'src/core/PerceptronTagger'));
const DependencyParser = require(path.join(ROOT, 'src/core/DependencyParser'));
const GazetteerNER = require(path.join(ROOT, 'src/graph/GazetteerNER'));

// Load models
const posModel = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/pos-weights-pruned.json'), 'utf8'));
const depModel = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/dep-weights-pruned.json'), 'utf8'));

// Load gazetteers
const gazetteersDir = path.join(ROOT, 'src/data/gazetteers');
const gazetteers = fs.readdirSync(gazetteersDir)
  .filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(fs.readFileSync(path.join(gazetteersDir, f), 'utf8')));

// Build pipeline
function buildGraph(text) {
  const builder = new SemanticGraphBuilder({});
  builder._treePosTagger = new PerceptronTagger(posModel);
  builder._treeDepParser = new DependencyParser(depModel);
  if (gazetteers.length > 0) builder._treeGazetteerNER = new GazetteerNER(gazetteers);
  return builder.build(text, { useTreeExtractors: true });
}

// ============================================================================
// Test infrastructure
// ============================================================================

let passed = 0;
let failed = 0;
const errors = [];
const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', bright: '\x1b[1m'
};

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write(`  ${C.green}\u2713${C.reset} ${name}\n`);
  } catch (e) {
    failed++;
    errors.push({ name, error: e.message });
    process.stdout.write(`  ${C.red}\u2717${C.reset} ${name}: ${e.message}\n`);
  }
}

function assertValidOutput(result, desc) {
  if (result === null || result === undefined) {
    throw new Error(`${desc}: returned null/undefined`);
  }
  if (typeof result !== 'object') {
    throw new Error(`${desc}: expected object, got ${typeof result}`);
  }
  // Allow error responses from input validation
  if (result._metadata && result._metadata.inputValidationFailed) {
    return; // Valid rejection
  }
  if (!Array.isArray(result['@graph'])) {
    throw new Error(`${desc}: missing @graph array`);
  }
  // Verify JSON-serializable
  try {
    JSON.stringify(result);
  } catch (e) {
    throw new Error(`${desc}: not JSON-serializable: ${e.message}`);
  }
}

// ============================================================================
// AC-4.4: Unicode Handling (30 tests)
// ============================================================================

console.log(`\n${C.bright}======================================================================${C.reset}`);
console.log(`${C.bright}AC-4.4 through AC-4.7: Adversarial & Edge Case Tests${C.reset}`);
console.log(`${C.bright}======================================================================${C.reset}`);

console.log(`\n${C.cyan}--- AC-4.4: Unicode Handling ---${C.reset}`);

const unicodeTests = [
  { name: 'Smart quotes (curly)', input: '\u201CThe doctor\u201D treated the \u2018patient\u2019' },
  { name: 'Em dash', input: 'The doctor \u2014 a specialist \u2014 treated the patient' },
  { name: 'En dash', input: 'The doctor\u2013nurse team treated the patient' },
  { name: 'Zero-width space', input: 'The\u200B doctor\u200B treated\u200B the\u200B patient' },
  { name: 'Zero-width non-joiner', input: 'The\u200C doctor\u200C treated the patient' },
  { name: 'Zero-width joiner', input: 'The\u200D doctor treated the patient' },
  { name: 'Non-breaking space', input: 'The\u00A0doctor treated\u00A0the patient' },
  { name: 'Combining diacritics stacked', input: 'The do\u0300\u0301\u0302\u0303\u0304ctor treated the patient' },
  { name: 'RTL override character', input: '\u202EThe doctor treated the patient' },
  { name: 'RTL mark + LTR mark', input: '\u200FThe\u200E doctor treated the patient' },
  { name: 'Greek omicron homoglyph', input: 'The d\u03BFct\u03BFr treated the patient' },
  { name: 'Cyrillic а homoglyph', input: 'The doctor tre\u0430ted the p\u0430tient' },
  { name: 'Fullwidth ASCII', input: '\uFF34\uFF48\uFF45 doctor treated the patient' },
  { name: 'Replacement character', input: '\uFFFD\uFFFD The doctor treated the patient' },
  { name: 'BOM character', input: '\uFEFFThe doctor treated the patient' },
  { name: 'Soft hyphen', input: 'The doc\u00ADtor trea\u00ADted the pa\u00ADtient' },
  { name: 'Figure space + thin space', input: 'The\u2007doctor\u2009treated the patient' },
  { name: 'Ogham space mark', input: 'The\u1680doctor treated the patient' },
  { name: 'Mathematical bold', input: '\uD835\uDC13\uD835\uDC21\uD835\uDC1E doctor treated' },
  { name: 'Enclosed alphanumerics', input: '\u24C9\u24D7\u24D4 doctor treated the patient' },
  { name: 'CJK compatibility chars', input: 'The doctor \u32A4 treated the patient' },
  { name: 'Musical symbols', input: 'The doctor \uD834\uDD1E treated the patient' },
  { name: 'Interlinear annotation', input: 'The\uFFF9doctor\uFFFA\uFFFBtreated' },
  { name: 'Tag characters (deprecated)', input: 'The\uDB40\uDC01 doctor treated' },
  { name: 'Variation selectors', input: 'The doctor\uFE00 treated\uFE0F the patient' },
  { name: 'Line separator', input: 'The doctor\u2028treated the patient' },
  { name: 'Paragraph separator', input: 'The doctor\u2029treated the patient' },
  { name: 'Ideographic space', input: 'The\u3000doctor treated the patient' },
  { name: 'Object replacement char', input: 'The \uFFFC doctor treated the patient' },
  { name: 'Mixed Unicode categories', input: '\u200E\u202A\u200FThe\u00A0\u200Bdoctor\u200D treated' },
];

for (const tc of unicodeTests) {
  test(`AC-4.4: ${tc.name}`, () => {
    const result = buildGraph(tc.input);
    assertValidOutput(result, tc.name);
  });
}

// ============================================================================
// AC-4.5: URL, Email, Emoji Resilience (30 tests)
// ============================================================================

console.log(`\n${C.cyan}--- AC-4.5: URL, Email, Emoji Resilience ---${C.reset}`);

const urlEmojiTests = [
  { name: 'Simple URL', input: 'Visit https://example.com/path for details' },
  { name: 'URL with query params', input: 'The page at https://example.com/path?q=1&r=2#hash was reviewed' },
  { name: 'URL with port', input: 'The server at http://localhost:8080/api responded' },
  { name: 'Email address', input: 'Contact dr.smith@hospital.org about the case' },
  { name: 'Multiple emails', input: 'Send to a@b.com and c@d.com for review' },
  { name: 'IPv4 address', input: 'The server at 192.168.1.1 was compromised' },
  { name: 'IPv6 address', input: 'The host 2001:db8::1 was unreachable' },
  { name: 'FTP URL', input: 'Download from ftp://files.example.com/report.pdf' },
  { name: 'Data URI', input: 'The image data:image/png;base64,abc123 was embedded' },
  { name: 'Simple emoji', input: 'The doctor \uD83D\uDC89 treated the patient \uD83D\uDE4F' },
  { name: 'Emoji sequence (ZWJ)', input: 'The \uD83D\uDC68\u200D\u2695\uFE0F doctor treated' },
  { name: 'Flag emoji', input: 'The \uD83C\uDDFA\uD83C\uDDF8 agency reviewed the case' },
  { name: 'Emoji-only input', input: '\uD83D\uDC69\u200D\uD83D\uDCBB\uD83D\uDC68\u200D\u2695\uFE0F' },
  { name: 'Hashtag', input: '#PatientSafety The doctor reviewed the case' },
  { name: 'Multiple hashtags', input: '#Health #Safety #Protocol were reviewed' },
  { name: 'At-mention', input: '@DrSmith reviewed the patient chart' },
  { name: 'Mixed hashtag emoji', input: '#\uD83C\uDFE5 Hospital safety was reviewed' },
  { name: 'URL-like file path', input: 'The file C:\\Users\\admin\\report.docx was submitted' },
  { name: 'Unix file path', input: 'The log at /var/log/syslog showed the error' },
  { name: 'Markdown-like syntax', input: 'The **doctor** _treated_ the `patient`' },
  { name: 'HTML entity references', input: 'The doctor &amp; nurse treated the patient' },
  { name: 'Percent-encoded URL', input: 'Visit https://example.com/path%20with%20spaces for details' },
  { name: 'Phone number', input: 'Call 1-800-555-0199 for the nurse station' },
  { name: 'Scientific notation', input: 'The dosage was 1.5e-3 mg per kg' },
  { name: 'Currency symbols', input: 'The treatment cost $5,000 or \u20AC4,200' },
  { name: 'Copyright and trademark', input: 'The MedDevice\u00AE was FDA\u2122 approved' },
  { name: 'Bullet points', input: '\u2022 The doctor treated \u2022 the nurse assisted' },
  { name: 'Arrows and symbols', input: 'Doctor \u2192 Patient \u2190 Nurse' },
  { name: 'Box drawing characters', input: 'The doctor \u2500\u2500\u2500 treated the patient' },
  { name: 'Superscript/subscript', input: 'H\u2082O was administered by the nurse\u00B2' },
];

for (const tc of urlEmojiTests) {
  test(`AC-4.5: ${tc.name}`, () => {
    const result = buildGraph(tc.input);
    assertValidOutput(result, tc.name);
  });
}

// ============================================================================
// AC-4.6: Heavy Punctuation and Legal Text (40 tests)
// ============================================================================

console.log(`\n${C.cyan}--- AC-4.6: Heavy Punctuation and Legal Text ---${C.reset}`);

const punctuationTests = [
  { name: 'Nested parentheticals', input: 'Section 101(a)(2)(B) of Title 8' },
  { name: 'Deeply nested parens', input: 'The ((((doctor)))) treated the patient' },
  { name: 'Repeated periods', input: 'The doctor.....treated the patient' },
  { name: 'Ellipsis chains', input: 'The doctor... treated... the patient...' },
  { name: 'Unicode ellipsis', input: 'The doctor\u2026 treated\u2026 the patient' },
  { name: 'Repeated commas', input: 'The doctor,,, treated,,, the patient' },
  { name: 'Semicolon flooding', input: 'Doctor; treated; patient; hospital; medication; nurse' },
  { name: 'Colon heavy', input: 'Subject: Patient: Treatment: Outcome: Recovery' },
  { name: 'Slash heavy', input: 'The doctor/nurse/specialist treated the patient' },
  { name: 'Backslash heavy', input: 'The doctor\\nurse treated\\examined the patient' },
  { name: 'Mixed brackets', input: 'The [doctor] {treated} (the) <patient>' },
  { name: 'Quote nesting single', input: "The 'doctor' 'treated' the 'patient'" },
  { name: 'Quote nesting double', input: 'The "doctor" "treated" the "patient"' },
  { name: 'Mixed quote styles', input: 'The \u201Cdoctor\u201D \'treated\' the "patient"' },
  { name: 'Exclamation flooding', input: 'The doctor treated the patient!!!!' },
  { name: 'Question flooding', input: 'Did the doctor treat the patient????' },
  { name: 'Mixed terminal punctuation', input: 'The doctor treated?! The nurse assisted!?' },
  { name: 'Hyphen chain', input: 'The state-of-the-art treatment was administered' },
  { name: 'Em dash chain', input: 'The doctor\u2014\u2014\u2014treated the patient' },
  { name: 'Asterisk emphasis', input: '*The* **doctor** ***treated*** the patient' },
  { name: 'Underscore emphasis', input: '_The_ __doctor__ ___treated___ the patient' },
  { name: 'Pipe characters', input: 'Doctor | Nurse | Patient | Treatment' },
  { name: 'Tilde characters', input: 'The ~doctor~ treated the ~~patient~~' },
  { name: 'At signs in text', input: 'The doctor @ hospital treated the patient' },
  { name: 'Caret characters', input: 'The doctor^nurse treated the patient^subject' },
  { name: 'Ampersand heavy', input: 'The doctor & nurse & specialist treated' },
  { name: 'Plus signs', input: 'The doctor + nurse treated the patient' },
  { name: 'Equals signs', input: 'Treatment = medication + therapy' },
  { name: 'Number signs', input: 'Patient #12345 was treated in room #5' },
  { name: 'Legal citation style', input: 'Pursuant to 42 U.S.C. \u00A7 1983, the defendant' },
  { name: 'Legal section reference', input: 'Under Section 501(c)(3) of the Internal Revenue Code' },
  { name: 'Legal with roman numerals', input: 'Article III, Section 2, Clause 1 grants the power' },
  { name: 'Consecutive punctuation', input: 'The doctor,.;:treated the patient' },
  { name: 'All punctuation sentence', input: '.,;:!?-()[]{}"\'/\\@#$%^&*_+=~`|<>' },
  { name: 'Numeric-heavy with periods', input: 'Version 3.14.159.2653 was released on 2026.02.17' },
  { name: 'Time format', input: 'The surgery at 14:30:00 lasted 2:15:00' },
  { name: 'Date format ISO', input: 'The treatment on 2026-02-17T14:30:00Z was successful' },
  { name: 'Measurement units', input: 'The dosage of 500mg/m\u00B2 was administered IV at 100mL/hr' },
  { name: 'Chemical formula', input: 'NaCl (0.9%) and C6H12O6 were administered' },
  { name: 'Math expression', input: 'If x > 5 && y < 10 || z == 0, treat the patient' },
];

for (const tc of punctuationTests) {
  test(`AC-4.6: ${tc.name}`, () => {
    const result = buildGraph(tc.input);
    assertValidOutput(result, tc.name);
  });
}

// ============================================================================
// AC-4.7: All-Caps and Degenerate Cases (30 tests)
// ============================================================================

console.log(`\n${C.cyan}--- AC-4.7: All-Caps and Degenerate Cases ---${C.reset}`);

const degenerateTests = [
  { name: 'All caps simple', input: 'THE DOCTOR TREATED THE PATIENT' },
  { name: 'All caps organizational', input: 'CBP IS A COMPONENT OF DHS' },
  { name: 'All caps with acronym', input: 'THE FBI AND CIA INVESTIGATED THE CASE' },
  { name: 'Mixed case random', input: 'tHe DoCtOr TrEaTeD tHe PaTiEnT' },
  { name: 'Single character', input: 'A' },
  { name: 'Two characters', input: 'OK' },
  { name: 'Single word', input: 'Doctor' },
  { name: 'Single long word', input: 'Supercalifragilisticexpialidocious' },
  { name: 'Numbers only', input: '12345 6789 0' },
  { name: 'Repeated word (100x)', input: Array(100).fill('the').join(' ') },
  { name: 'Repeated letter (500)', input: 'a'.repeat(500) },
  { name: 'Alternating case', input: 'aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpP' },
  { name: 'All spaces', input: '     ' },
  { name: 'Tab characters', input: 'The\tdoctor\ttreated\tthe\tpatient' },
  { name: 'Newlines', input: 'The doctor\ntreated\nthe patient' },
  { name: 'Carriage returns', input: 'The doctor\r\ntreated\r\nthe patient' },
  { name: 'Mixed whitespace', input: 'The \t doctor \n treated \r\n the patient' },
  { name: 'Leading whitespace', input: '   The doctor treated the patient' },
  { name: 'Trailing whitespace', input: 'The doctor treated the patient   ' },
  { name: 'Double spaces', input: 'The  doctor  treated  the  patient' },
  { name: 'Triple+ spaces', input: 'The     doctor     treated     the     patient' },
  { name: 'Mixed scripts CJK', input: 'The \u533B\u751F treated the \u60A3\u8005' },
  { name: 'Arabic script', input: 'The \u0637\u0628\u064A\u0628 treated the patient' },
  { name: 'Devanagari script', input: 'The \u0921\u0949\u0915\u094D\u091F\u0930 treated the patient' },
  { name: 'Korean script', input: 'The \uC758\uC0AC treated the patient' },
  { name: 'All whitespace after normalization', input: '\u200B\u200C\u200D\uFEFF' },
  { name: 'Extremely short (2 chars)', input: 'Hi' },
  { name: 'Just punctuation', input: '...' },
  { name: 'Boolean-like', input: 'true false null undefined NaN Infinity' },
  { name: 'SQL-like keywords', input: 'SELECT * FROM patients WHERE id = 1 DROP TABLE' },
];

for (const tc of degenerateTests) {
  test(`AC-4.7: ${tc.name}`, () => {
    const result = buildGraph(tc.input);
    assertValidOutput(result, tc.name);
  });
}

// ============================================================================
// Results
// ============================================================================

console.log(`\n${C.bright}======================================================================${C.reset}`);
console.log(`${C.bright}RESULTS: ${C.green}${passed} passed${C.reset}, ${failed > 0 ? C.red : ''}${failed} failed${C.reset} (${passed + failed} total)${C.reset}`);
console.log(`${C.bright}======================================================================${C.reset}`);

if (errors.length > 0) {
  console.log(`\n${C.red}Failures:${C.reset}`);
  for (const e of errors) {
    console.log(`  - ${e.name}: ${e.error}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
