#!/usr/bin/env node
/**
 * validate_ambiguous_fixes.js — Check which AMBIGUOUS_WORD_FIXES
 * the perceptron tagger correctly handles.
 *
 * Runs each word in its original sentence context through the perceptron
 * and compares against the expected POS tag from AMBIGUOUS_WORD_FIXES.
 */

'use strict';

const path = require('path');
const fs = require('fs');

const PerceptronTagger = require(path.join(__dirname, '../../src/core/PerceptronTagger'));
const Tokenizer = require(path.join(__dirname, '../../src/graph/Tokenizer'));

const modelPath = path.join(__dirname, '../models/pos-weights-pruned.json');
if (!fs.existsSync(modelPath)) {
  console.error('ERROR: Trained model not found. Run train_pos_tagger.py first.');
  process.exit(1);
}

const model = JSON.parse(fs.readFileSync(modelPath, 'utf-8'));
const tagger = new PerceptronTagger(model);
const tokenizer = new Tokenizer();

// AMBIGUOUS_WORD_FIXES entries with sentence contexts
const FIXES = [
  // Prepositions (IN)
  { word: 'for', expected: 'IN', context: 'The nurse did it for the patient' },
  { word: 'with', expected: 'IN', context: 'The patient was treated with chemotherapy' },
  { word: 'on', expected: 'IN', context: 'The surgeon operated on the patient' },
  { word: 'in', expected: 'IN', context: 'The server in the datacenter failed' },
  { word: 'at', expected: 'IN', context: 'The meeting was held at headquarters' },
  { word: 'from', expected: 'IN', context: 'The report came from the agency' },
  { word: 'to', expected: 'IN', context: 'The nurse explained the procedure to the patient' },
  { word: 'into', expected: 'IN', context: 'The data was loaded into the system' },
  { word: 'onto', expected: 'IN', context: 'The files were copied onto the drive' },
  { word: 'by', expected: 'IN', context: 'The patient was treated by the doctor' },
  { word: 'of', expected: 'IN', context: 'CBP is a component of DHS' },

  // Determiners (DT)
  { word: 'the', expected: 'DT', context: 'The doctor treated the patient' },
  { word: 'a', expected: 'DT', context: 'CBP is a component of DHS' },
  { word: 'an', expected: 'DT', context: 'The agency issued an alert' },

  // Coordinating conjunctions (CC)
  { word: 'and', expected: 'CC', context: 'Customs and Border Protection' },
  { word: 'or', expected: 'CC', context: 'The nurse or the doctor treated the patient' },

  // Common nouns (NN)
  { word: 'family', expected: 'NN', context: 'The family received the news' },
  { word: 'error', expected: 'NN', context: 'The error caused harm to the system' },
  { word: 'harm', expected: 'NN', context: 'The error caused harm to the system' },
  { word: 'news', expected: 'NN', context: 'The family received the news' },
  { word: 'hope', expected: 'NN', context: 'There is still hope for recovery' },

  // Past tense verbs (VBD) in sentence context
  { word: 'gave', expected: 'VBD', context: 'The nurse gave the patient medication' },
  { word: 'sent', expected: 'VBD', context: 'The agency sent the report' },
  { word: 'told', expected: 'VBD', context: 'The doctor told the patient the results' },
  { word: 'showed', expected: 'VBD', context: 'The nurse showed the patient the chart' },
  { word: 'taught', expected: 'VBD', context: 'The professor taught the students' },
  { word: 'offered', expected: 'VBD', context: 'The agency offered assistance' },
  { word: 'lent', expected: 'VBD', context: 'The bank lent money to the company' },
  { word: 'passed', expected: 'VBD', context: 'Congress passed the bill' },
  { word: 'handed', expected: 'VBD', context: 'The nurse handed the patient the form' },
  { word: 'got', expected: 'VBD', context: 'The patient got the medication' },
  { word: 'received', expected: 'VBD', context: 'The patient received the medication' },
  { word: 'brought', expected: 'VBD', context: 'The nurse brought the medication to the patient' },
  { word: 'operated', expected: 'VBD', context: 'The surgeon operated on the patient' },
  { word: 'explained', expected: 'VBD', context: 'The doctor explained the diagnosis to the patient' },
  { word: 'caused', expected: 'VBD', context: 'The error caused harm to the system' },
  { word: 'transported', expected: 'VBD', context: 'The ambulance transported the patient to the hospital' },

  // Base form verbs (VB) in infinitive/modal context
  { word: 'give', expected: 'VB', context: 'The nurse will give the patient medication' },
  { word: 'send', expected: 'VB', context: 'The agency will send the report' },
  { word: 'tell', expected: 'VB', context: 'The doctor will tell the patient' },
  { word: 'show', expected: 'VB', context: 'The nurse will show the patient the chart' },
  { word: 'teach', expected: 'VB', context: 'The professor will teach the students' },
  { word: 'offer', expected: 'VB', context: 'The agency will offer assistance' },
  { word: 'lend', expected: 'VB', context: 'The bank will lend money to the company' },
  { word: 'pass', expected: 'VB', context: 'Congress will pass the bill' },
  { word: 'hand', expected: 'VB', context: 'The nurse will hand the patient the form' },
  { word: 'get', expected: 'VB', context: 'The patient will get the medication' },
  { word: 'receive', expected: 'VB', context: 'The patient will receive the medication' },
  { word: 'bring', expected: 'VB', context: 'The nurse will bring the medication' },
  { word: 'operate', expected: 'VB', context: 'The surgeon will operate on the patient' },
  { word: 'explain', expected: 'VB', context: 'The doctor will explain the diagnosis' },
  { word: 'cause', expected: 'VB', context: 'This may cause harm to the system' },
  { word: 'transport', expected: 'VB', context: 'The ambulance will transport the patient' },

  // Conditional words (context-dependent)
  { word: 'alert', expected: 'NN', context: 'The agency issued an alert' },
  { word: 'access', expected: 'NN', context: 'The user needs access to the system' },
  { word: 'change', expected: 'NN', context: 'The policy requires a change' },
];

console.log('AMBIGUOUS_WORD_FIXES Validation Report');
console.log('=' .repeat(72));
console.log(`Perceptron model: ${model.version} (${model.provenance.trainingDate})`);
console.log(`Pruned model accuracy: ${(model.provenance.postPruneDevAccuracy * 100).toFixed(2)}%`);
console.log();

let correct = 0;
let incorrect = 0;
const eliminated = [];
const stillNeeded = [];

for (const fix of FIXES) {
  const tokens = tokenizer.tokenizeForPOS(fix.context);
  const tags = tagger.tag(tokens);

  // Find the word in the tokenized output
  const idx = tokens.findIndex(t => t.toLowerCase() === fix.word.toLowerCase());
  if (idx === -1) {
    console.log(`  WARNING: "${fix.word}" not found in tokenized "${fix.context}"`);
    continue;
  }

  const perceptronTag = tags[idx];
  const matches = perceptronTag === fix.expected;

  if (matches) {
    correct++;
    eliminated.push(fix.word);
  } else {
    incorrect++;
    stillNeeded.push({ word: fix.word, expected: fix.expected, got: perceptronTag, context: fix.context });
  }

  const mark = matches ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(`  ${mark} ${fix.word.padEnd(15)} expected=${fix.expected.padEnd(4)} got=${perceptronTag.padEnd(4)} ${matches ? 'ELIMINATED' : 'STILL NEEDED'}`);
}

console.log('\n' + '=' .repeat(72));
console.log(`Results: ${correct}/${correct + incorrect} fixes eliminated by perceptron`);
console.log(`  Eliminated (${eliminated.length}): ${eliminated.join(', ')}`);

if (stillNeeded.length > 0) {
  console.log(`\n  Still needed (${stillNeeded.length}):`);
  for (const s of stillNeeded) {
    console.log(`    ${s.word}: expected ${s.expected}, perceptron says ${s.got}`);
    console.log(`      context: "${s.context}"`);
  }
}

console.log(`\nConclusion: ${correct}/${correct + incorrect} (${((correct / (correct + incorrect)) * 100).toFixed(1)}%) of AMBIGUOUS_WORD_FIXES eliminated`);
