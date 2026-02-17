# Model Weight License

**Last updated:** 2026-02-17

## Distributed Model Files

| File | Size | Purpose | Training Source |
|------|------|---------|----------------|
| `pos-weights-pruned.json` | ~2.6 MB | Perceptron POS Tagger | UD English-EWT v2.14 |
| `dep-weights-pruned.json` | ~3.3 MB | Arc-Eager Dependency Parser | UD English-EWT v2.14 |
| `dep-calibration.json` | ~1 KB | Parser calibration parameters | UD English-EWT v2.14 |

## Training Data Attribution

These model weights were trained on the **Universal Dependencies English Web Treebank (UD-EWT)**:

- **Version:** v2.14 (release 2024-05-15)
- **License:** [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- **URL:** https://universaldependencies.org/treebanks/en_ewt/
- **Source repository:** https://github.com/UniversalDependencies/UD_English-EWT
- **Original citation:**

  > Silveira, N., Dozat, T., de Marneffe, M.-C., Bowman, S., Connor, M.,
  > Bauer, J., & Manning, C. D. (2014). A Gold Standard Dependency Corpus
  > for English. *Proceedings of LREC 2014*.

## Derivative Work Status

These weight files contain numerical parameters (feature weights) learned by
statistical training algorithms from the UD-EWT annotations. They do not contain
any original text from the UD-EWT corpus.

**Whether trained model weights constitute a "derivative work" under CC BY-SA 4.0
is an open legal question.** Pending legal determination:

- **If derivative work:** These files are licensed under CC BY-SA 4.0,
  and any redistribution must comply with ShareAlike requirements.
- **If not derivative work:** These files are original works licensed under
  the project's MIT license.

Until legal sign-off is obtained, we treat these weights conservatively as
potentially subject to CC BY-SA 4.0 and include full attribution.

## Training Methodology

- **POS Tagger:** Averaged Perceptron (Collins 2002), trained for 5 epochs
  on UD-EWT CoNLL-U files using XPOS (Penn Treebank) tags
- **Dependency Parser:** Arc-Eager transition-based parser with feature hashing,
  trained on UD-EWT using UD v2 dependency labels
- **Pruning:** Weights below threshold removed to reduce file size
  (no accuracy degradation on held-out set)

## Reproducibility

Training scripts are located at:
- `training/scripts/train_pos_tagger.py`
- `training/scripts/train_dep_parser.py`

To reproduce, download UD-EWT v2.14 and run the training scripts.
See `training/README.md` for detailed instructions.
