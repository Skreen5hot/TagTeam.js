#!/usr/bin/env python3
"""
extract_alignment_fixtures.py — Extracts representative sentences from UD-EWT
for tokenizer alignment testing (AC-0.4).

Selects 100 sentences that cover critical tokenization patterns:
- Contractions (n't, 'm, 're, 've, 'll, 'd)
- Possessives ('s)
- Parentheses
- Abbreviations (U.S., etc.)
- Hyphens
- Numbers with decimals
- Punctuation

Output: tests/unit/phase1/fixtures/ud-ewt-alignment.json
"""

import json
import os
import re
import sys
from collections import defaultdict

UD_EWT_DEV = os.path.join(os.path.dirname(__file__), '..', 'data',
                           'UD_English-EWT', 'en_ewt-ud-dev.conllu')

OUTPUT = os.path.join(os.path.dirname(__file__), '..', '..', 'tests',
                      'unit', 'phase1', 'fixtures', 'ud-ewt-alignment.json')


def parse_conllu(filepath, max_sentences=None):
    """Parse CoNLL-U file, yielding (sent_id, text, tokens) tuples.

    tokens: list of dicts with 'id', 'form', 'xpos'
    Multi-word token ranges (e.g., 29-30) are included as 'mwt' entries.
    """
    sentences = []
    current = {'sent_id': None, 'text': None, 'tokens': [], 'mwts': []}

    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.rstrip('\n')

            if line.startswith('# sent_id'):
                current['sent_id'] = line.split('=', 1)[1].strip()
            elif line.startswith('# text'):
                current['text'] = line.split('=', 1)[1].strip()
            elif line == '':
                if current['tokens']:
                    sentences.append(current)
                    if max_sentences and len(sentences) >= max_sentences:
                        break
                current = {'sent_id': None, 'text': None, 'tokens': [], 'mwts': []}
            elif not line.startswith('#'):
                parts = line.split('\t')
                if len(parts) >= 5:
                    token_id = parts[0]
                    form = parts[1]
                    xpos = parts[4]

                    if '-' in token_id:
                        # Multi-word token (contraction surface form)
                        start, end = token_id.split('-')
                        current['mwts'].append({
                            'start': int(start),
                            'end': int(end),
                            'form': form
                        })
                    elif '.' not in token_id:
                        # Regular token (skip empty nodes with '.')
                        current['tokens'].append({
                            'id': int(token_id),
                            'form': form,
                            'xpos': xpos
                        })

    return sentences


def categorize_sentence(sent):
    """Tag a sentence with the tokenization patterns it contains."""
    categories = set()
    text = sent['text'] or ''

    # Check for contractions (via MWTs)
    for mwt in sent['mwts']:
        form = mwt['form'].lower()
        if "n't" in form:
            categories.add('negation_contraction')
        elif "'m" in form or "'m" in form:
            categories.add('pronoun_be')
        elif "'re" in form or "'re" in form:
            categories.add('pronoun_be')
        elif "'ve" in form or "'ve" in form:
            categories.add('pronoun_have')
        elif "'ll" in form or "'ll" in form:
            categories.add('pronoun_will')
        elif "'d" in form or "'d" in form:
            categories.add('pronoun_would')
        elif "'s" in form or "'s" in form:
            categories.add('possessive_or_is')

    # Check for parentheses
    if '(' in text or ')' in text:
        categories.add('parentheses')

    # Check for abbreviations
    if re.search(r'\b[A-Z]\.[A-Z]\.', text):
        categories.add('abbreviation')

    # Check for hyphens in words
    if re.search(r'\w-\w', text):
        categories.add('hyphen')

    # Check for numbers with decimals
    if re.search(r'\d+\.\d+', text):
        categories.add('decimal_number')

    # Check for quotes
    if '"' in text or '"' in text or '"' in text:
        categories.add('quotes')

    # Check for colons/semicolons
    if ':' in text or ';' in text:
        categories.add('colon_semicolon')

    return categories


def select_representative(sentences, target=100):
    """Select representative sentences covering all categories."""
    category_counts = defaultdict(int)
    category_targets = {
        'negation_contraction': 8,
        'possessive_or_is': 8,
        'pronoun_be': 5,
        'pronoun_have': 3,
        'pronoun_will': 3,
        'pronoun_would': 3,
        'parentheses': 5,
        'abbreviation': 3,
        'hyphen': 5,
        'decimal_number': 3,
        'quotes': 3,
        'colon_semicolon': 3,
    }

    selected = []
    selected_ids = set()

    # First pass: select sentences that cover underrepresented categories
    for category, target_count in category_targets.items():
        for sent in sentences:
            if len(selected) >= target:
                break
            if sent['sent_id'] in selected_ids:
                continue
            cats = categorize_sentence(sent)
            if category in cats and category_counts[category] < target_count:
                selected.append(sent)
                selected_ids.add(sent['sent_id'])
                for c in cats:
                    category_counts[c] += 1

    # Second pass: fill remaining with simple sentences (no special patterns)
    for sent in sentences:
        if len(selected) >= target:
            break
        if sent['sent_id'] in selected_ids:
            continue
        # Prefer shorter sentences for baseline coverage
        if len(sent['tokens']) <= 15:
            selected.append(sent)
            selected_ids.add(sent['sent_id'])

    return selected


def build_fixture(sentences):
    """Build the JSON fixture for the alignment test."""
    fixtures = []

    for sent in sentences:
        # Build the gold token list (what our tokenizer should produce)
        # Skip MWT surface forms — use the individual syntactic tokens
        gold_tokens = [t['form'] for t in sent['tokens']]
        gold_xpos = [t['xpos'] for t in sent['tokens']]

        # Build MWT info for the test to understand contractions
        mwts = []
        for mwt in sent['mwts']:
            parts = [t['form'] for t in sent['tokens']
                     if mwt['start'] <= t['id'] <= mwt['end']]
            mwts.append({
                'surface': mwt['form'],
                'parts': parts
            })

        fixtures.append({
            'sent_id': sent['sent_id'],
            'text': sent['text'],
            'gold_tokens': gold_tokens,
            'gold_xpos': gold_xpos,
            'token_count': len(gold_tokens),
            'mwts': mwts,
            'categories': sorted(categorize_sentence(sent))
        })

    return fixtures


def main():
    if not os.path.isfile(UD_EWT_DEV):
        print(f'ERROR: UD-EWT dev file not found: {UD_EWT_DEV}')
        print('Run: git clone https://github.com/UniversalDependencies/UD_English-EWT.git training/data/UD_English-EWT/')
        sys.exit(1)

    print('Parsing UD-EWT dev set...')
    sentences = parse_conllu(UD_EWT_DEV)
    print(f'  Total sentences: {len(sentences)}')

    # Categorize all sentences
    all_cats = defaultdict(int)
    for sent in sentences:
        for cat in categorize_sentence(sent):
            all_cats[cat] += 1

    print('\nCategory distribution:')
    for cat, count in sorted(all_cats.items()):
        print(f'  {cat}: {count}')

    print('\nSelecting representative sentences...')
    selected = select_representative(sentences, target=100)
    print(f'  Selected: {len(selected)}')

    # Build fixture
    fixtures = build_fixture(selected)

    # Ensure output directory exists
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump({
            '_meta': {
                'source': 'UD_English-EWT v2.14 (en_ewt-ud-dev.conllu)',
                'purpose': 'AC-0.4 Tokenizer Alignment Test Fixtures',
                'count': len(fixtures),
                'categories': dict(sorted(all_cats.items())),
                'generator': 'training/scripts/extract_alignment_fixtures.py'
            },
            'sentences': fixtures
        }, f, indent=2, ensure_ascii=False)

    print(f'\nFixture written to: {OUTPUT}')
    print(f'  Sentences: {len(fixtures)}')

    # Category coverage of selected
    sel_cats = defaultdict(int)
    for f in fixtures:
        for cat in f['categories']:
            sel_cats[cat] += 1
    print('\nSelected category coverage:')
    for cat, count in sorted(sel_cats.items()):
        print(f'  {cat}: {count}')


if __name__ == '__main__':
    main()
