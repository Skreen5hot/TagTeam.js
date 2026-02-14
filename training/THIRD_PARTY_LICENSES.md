# Third-Party Licenses (Draft)

**Status:** DRAFT — Requires legal review before release.

This document tracks third-party resources used in the TagTeam.js major refactor,
particularly training data and model architectures.

---

## 1. UD English-EWT Treebank

**Used for:** Training the Perceptron POS Tagger (Phase 1) and Dependency Parser (Phase 2)

- **Full name:** Universal Dependencies English Web Treebank
- **Version:** v2.x (exact version to be pinned during Phase 1)
- **License:** CC BY-SA 4.0
- **URL:** https://universaldependencies.org/treebanks/en_ewt/
- **Citation:**
  > Silveira, N., Dozat, T., de Marneffe, M.-C., Bowman, S., Connor, M.,
  > Bauer, J., & Manning, C. D. (2014). A Gold Standard Dependency Corpus
  > for English. *Proceedings of LREC 2014*.

### Attribution Requirements (CC BY-SA 4.0)
- Credit the original creators
- Provide a link to the license
- Indicate if changes were made
- Distribute derivative works under the same license

### TagTeam Usage
- Raw CoNLL-U files are NOT distributed with TagTeam
- Trained model weights ARE distributed (derived work)
- Training scripts reference the treebank by URL for reproducibility

---

## 2. Penn Treebank POS Tagset

**Used for:** POS tag label convention (§5.1)

- **Authority:** Marcus, M. P., Santorini, B., & Marcinkiewicz, M. A. (1993)
- **License:** The tagset itself is not copyrightable (it is a standard/convention)
- **Note:** TagTeam uses the PTB tagset as labels. No PTB corpus data is used or distributed.

---

## 3. Universal Dependencies v2 Label Set

**Used for:** Dependency label convention (§5.2)

- **Authority:** Universal Dependencies Project
- **License:** The label set itself is not copyrightable (it is a standard/convention)
- **URL:** https://universaldependencies.org/u/dep/
- **Note:** TagTeam uses UD v2 labels as its dependency label convention. No UD annotation
  guidelines text is reproduced.

---

## 4. BFO 2.0 (Basic Formal Ontology)

**Used for:** Ontological alignment of role types

- **License:** CC BY 4.0
- **URL:** https://basic-formal-ontology.org/
- **Citation:**
  > Arp, R., Smith, B., & Spear, A. D. (2015). *Building Ontologies with
  > Basic Formal Ontology.* MIT Press.

---

## 5. CCO v1.5 (Common Core Ontologies)

**Used for:** Semantic role types (AgentRole, PatientRole, etc.)

- **License:** BSD 3-Clause
- **URL:** https://github.com/CommonCoreOntology/CommonCoreOntologies
- **Note:** TagTeam references CCO IRIs in its output. CCO OWL files are not bundled.

---

## 6. Existing TagTeam Dependencies

These are existing npm dependencies already in the project. Their licenses are tracked
in `package.json` and `node_modules/*/LICENSE`.

| Package | License | Usage |
|---------|---------|-------|
| compromise | MIT | NLP parsing (current pipeline) |
| jsPOS | LGPL-3.0 | POS tagging (current NPChunker) |

---

## TODO (Legal Review Checklist)

- [ ] Confirm CC BY-SA 4.0 compliance for UD-EWT derived model weights
- [ ] Determine if trained model weights constitute a "derivative work" under CC BY-SA
- [ ] Add NOTICE file to distributed package with required attributions
- [ ] Pin exact UD-EWT version used for training
- [ ] Review jsPOS LGPL-3.0 implications for bundled distribution
- [ ] Confirm BFO CC BY 4.0 attribution in output metadata
