#!/usr/bin/env node
/**
 * Phase 1b: Mechanically replace CURIE-prefixed terms with compact labels
 * in all src/graph/ files.
 *
 * Uses the @context in JSONLDSerializer.js as the authoritative mapping.
 * Skips JSONLDSerializer.js itself (that's where the definitions live).
 *
 * Usage:
 *   node scripts/curie-to-compact.js          # dry-run (show changes)
 *   node scripts/curie-to-compact.js --apply  # apply changes
 */

const fs = require('fs');
const path = require('path');
const glob = require('path');

const GRAPH_DIR = path.join(__dirname, '..', 'src', 'graph');
const SERIALIZER = path.join(GRAPH_DIR, 'JSONLDSerializer.js');

// ============================================================================
// Step 1: Parse @context to build CURIE → compact label map
// ============================================================================

const src = fs.readFileSync(SERIALIZER, 'utf8');
const curieToLabel = {};

// Match entries like:  CompactLabel: { '@id': 'prefix:localname' ... }
const re = /^\s+(?:'([^']+)'|(\w+))\s*:\s*\{[^}]*'@id'\s*:\s*'([^']+)'/gm;
let m;
while ((m = re.exec(src)) !== null) {
  const label = m[1] || m[2];
  const iri = m[3];
  // For duplicates (realized_in vs is_realized_by), keep both — they map
  // to different compact labels even though the IRI is the same.
  // We need CURIE → label, not IRI → label, so build from source usage.
  curieToLabel[iri] = label;
}

// Override duplicates: the source code uses specific CURIEs, not IRIs
// bfo:BFO_0000054 is used as `realized_in` (the original entry at line 162)
// bfo:is_realized_by is a separate compact label we added
// bfo:BFO_0000176 is used as `continuant_part_of` (original) and `is_part_of` (alias)
// For the purpose of replacing CURIEs in source, we need:
curieToLabel['bfo:BFO_0000054'] = 'realized_in'; // keep original
curieToLabel['bfo:BFO_0000176'] = 'continuant_part_of'; // keep original

// Also add the text-form BFO properties used in source:
// bfo:is_realized_by → is_realized_by  (already in @context)
// bfo:role_of → role_of  (already in @context)
curieToLabel['bfo:is_realized_by'] = 'is_realized_by';
curieToLabel['bfo:role_of'] = 'role_of';

// Source code sometimes uses tagteam: prefix for terms that belong to bfo:/cco:
// These need to map to the same compact label that the bfo:/cco: CURIE maps to.
curieToLabel['tagteam:located_in'] = 'located_in';     // @context: located_in → bfo:BFO_0000171
curieToLabel['tagteam:Entity'] = 'Entity';             // @context: Entity → bfo:BFO_0000001
curieToLabel['tagteam:prescribes'] = 'prescribes';     // @context: prescribes → cco:ont00001942

// ============================================================================
// Step 2: Build regex-safe replacement patterns
// ============================================================================

// Sort by longest CURIE first to avoid partial matches
const curies = Object.keys(curieToLabel).sort((a, b) => b.length - a.length);

// We need to replace CURIEs that appear as:
//   1. Property keys in string literals: 'tagteam:foo' or "tagteam:foo"
//   2. @type values in arrays: 'tagteam:Foo'
//   3. Template literals or concatenation: `tagteam:Foo`
//
// We must NOT replace:
//   - CURIEs inside @context definitions (JSONLDSerializer.js — already skipped)
//   - CURIEs in comments (risky but acceptable for now)
//   - Namespace prefix declarations like bfo: 'http://...'

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// Step 3: Process each file
// ============================================================================

const apply = process.argv.includes('--apply');
const files = fs.readdirSync(GRAPH_DIR)
  .filter(f => f.endsWith('.js') && f !== 'JSONLDSerializer.js')
  .sort();

let totalReplacements = 0;
let totalFiles = 0;

files.forEach(file => {
  const filePath = path.join(GRAPH_DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let fileReplacements = 0;

  curies.forEach(curie => {
    const label = curieToLabel[curie];
    // Replace 'curie' and "curie" occurrences
    // Use word boundary after the CURIE to avoid partial matches
    const pattern = new RegExp(
      "(['\"`])" + escapeRegex(curie) + "(['\"`])",
      'g'
    );
    const newContent = content.replace(pattern, (match, q1, q2) => {
      // Only replace if opening and closing quotes match
      if (q1 === q2 || (q1 === '`' || q2 === '`')) {
        fileReplacements++;
        return q1 + label + q2;
      }
      return match;
    });
    content = newContent;

    // Also replace when CURIE appears as a property access in brackets: ['tagteam:foo']
    // or as part of a string comparison: === 'tagteam:foo'
    // These are already covered by the quote-based pattern above.

    // Replace CURIEs in template literal expressions: ${...tagteam:foo...}
    // These are rare but let's handle: `...tagteam:Foo...`
    // Already covered by backtick quotes above.
  });

  if (fileReplacements > 0) {
    totalReplacements += fileReplacements;
    totalFiles++;

    if (apply) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✓ ${file}: ${fileReplacements} replacements applied`);
    } else {
      console.log(`  → ${file}: ${fileReplacements} replacements (dry-run)`);
    }

    // Verify: count remaining CURIEs (excluding comments and string definitions)
    const remaining = (content.match(/'(tagteam|bfo|cco):[a-zA-Z_][a-zA-Z0-9_]*'/g) || []);
    if (remaining.length > 0) {
      console.log(`    ⚠ ${remaining.length} CURIEs still present:`);
      [...new Set(remaining)].slice(0, 10).forEach(r => console.log(`      ${r}`));
    }
  }
});

console.log(`\nTotal: ${totalReplacements} replacements across ${totalFiles} files`);
if (!apply) {
  console.log('Run with --apply to write changes.');
}
