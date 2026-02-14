#!/usr/bin/env python3
"""
verify_ud_ewt.py — Validates UD-EWT treebank presence and integrity.

Source: TagTeam-Major-Refactor-v2.2.md §6 (Training Data)
Authority: Universal Dependencies Project (https://universaldependencies.org/)

Usage:
    python training/scripts/verify_ud_ewt.py
"""

import os
import sys
import re

UD_EWT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'UD_English-EWT')

REQUIRED_FILES = {
    'en_ewt-ud-train.conllu': {'min_sentences': 12000, 'min_tokens': 200000},
    'en_ewt-ud-dev.conllu':   {'min_sentences': 2000,  'min_tokens': 25000},
    'en_ewt-ud-test.conllu':  {'min_sentences': 2000,  'min_tokens': 25000},
}

REQUIRED_XPOS_TAGS = {
    'NN', 'NNS', 'NNP', 'NNPS', 'VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ',
    'DT', 'IN', 'JJ', 'RB', 'CC', 'PRP', 'MD', 'TO', 'CD', 'WDT', 'WP',
}


def count_conllu(filepath):
    """Count sentences and tokens in a CoNLL-U file."""
    sentences = 0
    tokens = 0
    xpos_tags = set()

    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line == '':
                continue
            if line.startswith('#'):
                if line.startswith('# sent_id'):
                    sentences += 1
                continue
            parts = line.split('\t')
            if len(parts) >= 5 and not '-' in parts[0] and not '.' in parts[0]:
                tokens += 1
                xpos_tags.add(parts[4])  # XPOS is column 5 (0-indexed: 4)

    return sentences, tokens, xpos_tags


def main():
    errors = []
    warnings = []

    # Check directory exists
    if not os.path.isdir(UD_EWT_DIR):
        print(f'FAIL: UD-EWT directory not found: {UD_EWT_DIR}')
        print('Download: git clone https://github.com/UniversalDependencies/UD_English-EWT.git training/data/UD_English-EWT/')
        sys.exit(1)

    print(f'UD-EWT directory: {os.path.abspath(UD_EWT_DIR)}')
    print()

    all_xpos = set()

    for filename, expected in REQUIRED_FILES.items():
        filepath = os.path.join(UD_EWT_DIR, filename)

        if not os.path.isfile(filepath):
            errors.append(f'Missing file: {filename}')
            continue

        sentences, tokens, xpos_tags = count_conllu(filepath)
        all_xpos.update(xpos_tags)

        status = 'OK'
        if sentences < expected['min_sentences']:
            errors.append(f'{filename}: only {sentences} sentences (expected >= {expected["min_sentences"]})')
            status = 'FAIL'
        if tokens < expected['min_tokens']:
            errors.append(f'{filename}: only {tokens} tokens (expected >= {expected["min_tokens"]})')
            status = 'FAIL'

        print(f'  {status}: {filename}')
        print(f'        Sentences: {sentences:,}')
        print(f'        Tokens:    {tokens:,}')
        print(f'        XPOS tags: {len(xpos_tags)}')
        print()

    # Check XPOS tag coverage
    missing_tags = REQUIRED_XPOS_TAGS - all_xpos
    if missing_tags:
        errors.append(f'Missing required XPOS tags: {missing_tags}')
    else:
        print(f'  OK: All {len(REQUIRED_XPOS_TAGS)} required XPOS tags present')
        print(f'      Total unique XPOS tags: {len(all_xpos)}')
        print()

    # Summary
    if errors:
        print('ERRORS:')
        for e in errors:
            print(f'  - {e}')
        sys.exit(1)
    else:
        print('All checks passed. UD-EWT treebank is ready for training.')
        sys.exit(0)


if __name__ == '__main__':
    main()
