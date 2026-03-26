#!/usr/bin/env node
/**
 * Replace CURIE-prefixed terms with compact labels in test files.
 * Same logic as curie-to-compact.js but targets tests/ directory.
 */

const fs = require('fs');
const path = require('path');

const SERIALIZER = path.join(__dirname, '..', 'src', 'graph', 'JSONLDSerializer.js');
const TESTS_DIR = path.join(__dirname, '..', 'tests');

// Build CURIE → compact label map from @context
const src = fs.readFileSync(SERIALIZER, 'utf8');
const curieToLabel = {};
const re = /^\s+(?:'([^']+)'|(\w+))\s*:\s*\{[^}]*'@id'\s*:\s*'([^']+)'/gm;
let m;
while ((m = re.exec(src)) !== null) {
  curieToLabel[m[3]] = m[1] || m[2];
}

// Override duplicates and add cross-namespace mappings
curieToLabel['bfo:BFO_0000054'] = 'realized_in';
curieToLabel['bfo:BFO_0000176'] = 'continuant_part_of';
curieToLabel['bfo:is_realized_by'] = 'is_realized_by';
curieToLabel['bfo:role_of'] = 'role_of';
curieToLabel['tagteam:located_in'] = 'located_in';
curieToLabel['tagteam:Entity'] = 'Entity';
curieToLabel['tagteam:prescribes'] = 'prescribes';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const curies = Object.keys(curieToLabel).sort((a, b) => b.length - a.length);

// Collect all .js test files
const testFiles = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      walk(full);
    } else if (f.endsWith('.js') && f !== 'curie-free-output.test.js') {
      testFiles.push(full);
    }
  }
}
walk(TESTS_DIR);

const apply = process.argv.includes('--apply');
let totalReplacements = 0;
let totalFiles = 0;

for (const filePath of testFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  let count = 0;

  for (const curie of curies) {
    const label = curieToLabel[curie];
    const pattern = new RegExp(
      "(['\"`])" + escapeRegex(curie) + "(['\"`])",
      'g'
    );
    content = content.replace(pattern, (match, q1, q2) => {
      if (q1 === q2) {
        count++;
        return q1 + label + q2;
      }
      return match;
    });
  }

  if (count > 0) {
    totalReplacements += count;
    totalFiles++;

    if (apply) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✓ ${path.relative(path.join(__dirname, '..'), filePath)}: ${count}`);
    } else {
      console.log(`  → ${path.relative(path.join(__dirname, '..'), filePath)}: ${count} (dry-run)`);
    }
  }
}

console.log(`\nTotal: ${totalReplacements} replacements across ${totalFiles} files`);
if (!apply) {
  console.log('Run with --apply to write changes.');
}
