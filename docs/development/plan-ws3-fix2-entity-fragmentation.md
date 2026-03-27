# WS-3 Fix 2: Multi-Word Entity Fragmentation

**Date:** 2026-03-26
**Priority:** High (WS-3 — demo-blocking)
**Status:** Plan approved, ready for TDD implementation

---

## Problem Statement

Multi-word named entities containing "and" or prepositional phrases are destroyed by the tree pipeline. Government agency names — the primary domain for this tool — fragment into unusable pieces:

| Input | Expected Entity | Actual Output |
|-------|----------------|---------------|
| "Customs and Border Protection enforces trade laws" | `Customs and Border Protection` | Entire sentence as one entity |
| "Department of Homeland Security issued the directive" | `Department of Homeland Security` | `Department` + `Homeland Security` (split) |
| "Immigration and Customs Enforcement deported the individual" | `Immigration and Customs Enforcement` | Entire sentence as one entity |
| "Fish and Wildlife Service manages protected areas" | `Fish and Wildlife Service` | Entity absorbs verb "manages" |
| "Bureau of Alcohol Tobacco and Firearms investigated" | `Bureau of Alcohol Tobacco and Firearms` | Three-way split |

These are the exact sentences that broke the stakeholder demo. The ontology matching layer cannot work because the entities it needs to match against never exist as nodes.

---

## Root Cause Analysis

Four distinct root causes, in priority order:

### RC-1: POS Tagger Mis-tags (Primary)

The PerceptronTagger tags "enforces" as `NNS` (plural noun) instead of `VBZ` (verb, 3rd person singular). With no verb in the tree, the parser has no predicate — it defaults the last noun as root and every other token becomes a modifier. This single POS error destroys the entire parse.

**Affected sentences:** "Customs and Border Protection enforces trade laws", "Fish and Wildlife Service manages protected areas"

**Fix:** Not addressable by TreeEntityExtractor changes alone. Requires either POS correction rules or retraining. However, a ComplexDesignatorDetector pre-pass can prevent the downstream damage even when the POS is wrong.

### RC-2: Root Path Bypasses Coordination Guard (Primary)

`TreeEntityExtractor.extract()` Step 0 (lines 109-128) processes root-position noun nodes through `_buildEntity()` directly, **bypassing `_handleCoordination()`**. The compound-crossing guard at lines 222-233 — designed exactly for "Customs and Border Protection" — is never reached because the entity enters through the root path, not the arc-bearing path.

**Fix location:** `TreeEntityExtractor.js` line 121 — Step 0 must route through `_handleCoordination()` before building entities.

### RC-3: `_collectEntitySpan()` Absorbs Verb Conjuncts (Primary)

`_collectEntitySpan()` (line 331) includes `conj` children unless they are copular predicates. When a root noun has a `conj` child that is a verb, the verb's entire subtree gets pulled into the entity span. "Immigration" (root) has `conj: deported`, so the entity becomes "Immigration and Customs Enforcement deported the individual".

**Fix location:** `TreeEntityExtractor.js` line 336 — add verb-tag check to `conj` exclusion.

### RC-4: PP Attachment Splits "Department of X" (Secondary)

The parser produces `Department --[nsubj]--> issued` and `Homeland --[obl]--> issued` as siblings. "Department" loses its post-nominal PP because the `of`-phrase attaches to `Homeland`, not to `Department`. This is a legitimate UD parse but wrong for this domain.

**Fix:** A `DepTreeCorrector` rule or post-extraction merge, but this is harder than RC-2/RC-3. The ComplexDesignatorDetector approach covers this case without parser changes.

---

## Fix Strategy: ComplexDesignatorDetector Pre-Pass

Rather than patching individual root causes in the dep parser and entity extractor (fragile, regression-prone), the primary fix is to **integrate ComplexDesignatorDetector into the tree pipeline as a pre-extraction pass**.

`ComplexDesignatorDetector` already correctly identifies all five agency names by surface form — capitalized multi-word spans with internal connectors ("and", "of"). It runs before dependency parsing can fragment them. Once detected, these spans become locked entity boundaries that the entity extractor must respect.

### Why This Approach

1. **Already implemented:** `ComplexDesignatorDetector.detect()` works. It just isn't called in the tree pipeline.
2. **Domain-robust:** Catches any capitalized multi-word proper name, not just gazetteer entries. "Federal Emergency Management Agency" works without being in any list.
3. **Parser-independent:** Even when the POS tagger or dep parser produce garbage, the surface-form detector preserves the entity boundary.
4. **Gazetteer-enhanced:** When a gazetteer is loaded, exact and alias matches further strengthen the detection.

### Integration Point

In `SemanticGraphBuilder._buildWithTreeExtractors()`, after tokenization (Stage 2) and before entity extraction (Stage 5):

```
Stage 2: Tokenize
Stage 3: POS tag
Stage 4: Dep parse
Stage 4.5: NEW — ComplexDesignatorDetector.detect(tokens, tags)
Stage 5: TreeEntityExtractor.extract(depTree, { lockedSpans })
```

The locked spans override the dep tree: TreeEntityExtractor treats each locked span as a single entity regardless of internal dependency structure.

### Defensive Fixes (RC-2 and RC-3)

In addition to the CDD pre-pass, fix the two code-level bugs that cause the worst symptoms:

**RC-2 fix:** In `extract()` Step 0, call `_handleCoordination()` for root-position entities before building them. If the coordination guard returns null (KEEP), build the full entity. If it returns split entities, use those.

**RC-3 fix:** In `_collectEntitySpan()`, exclude `conj` children whose dep tree tag is a verb (VB, VBD, VBZ, VBP, VBN, VBG). This prevents "Immigration" from absorbing "deported" and its subtree.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/graph/SemanticGraphBuilder.js` | Invoke CDD in `_buildWithTreeExtractors()` before entity extraction |
| `src/graph/TreeEntityExtractor.js` | Accept `lockedSpans` option; RC-2: route Step 0 through coordination guard; RC-3: exclude verb conjuncts from entity span |
| `src/graph/ComplexDesignatorDetector.js` | May need minor adapter for token-index output format |
| Tests | New test file for entity boundary preservation |

### What Does NOT Change

- `DepTreeCorrector.js` — No new parser rewrite rules (too fragile)
- `GazetteerNER.js` — Already has correct entries; not the fix point
- `PerceptronTagger.js` — POS model retraining is out of scope
- Modal detection (WS-3 Fix 1) — just shipped, orthogonal

---

## Acceptance Criteria

### Core Entity Boundary Preservation

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-EF-01 | "Customs and Border Protection enforces trade laws." | Entity with label containing "Customs and Border Protection" exists | Organization type |
| AC-EF-02 | "Customs and Border Protection enforces trade laws." | Entity span does NOT include "enforces" or "trade laws" | Clean boundary |
| AC-EF-03 | "Customs and Border Protection enforces trade laws." | Act node exists with verb "enforces" or lemma "enforce" | Separate from entity |
| AC-EF-04 | "Department of Homeland Security issued the directive." | Entity with label containing "Department of Homeland Security" exists | Organization type |
| AC-EF-05 | "Department of Homeland Security issued the directive." | No standalone "Homeland Security" or "Department" phantom entities | Single unified entity |
| AC-EF-06 | "Immigration and Customs Enforcement deported the individual." | Entity with label containing "Immigration and Customs Enforcement" exists | Organization type |
| AC-EF-07 | "Immigration and Customs Enforcement deported the individual." | Entity span does NOT include "deported" or "the individual" | Clean boundary |
| AC-EF-08 | "Immigration and Customs Enforcement deported the individual." | Act node has verb "deported" or lemma "deport" (not "Immigration") | Correct verb |

### Additional Agency Names

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-EF-09 | "Fish and Wildlife Service manages protected areas." | Entity "Fish and Wildlife Service" exists, does NOT include "manages" | Organization |
| AC-EF-10 | "The Bureau of Alcohol Tobacco and Firearms investigated the case." | Entity "Bureau of Alcohol Tobacco and Firearms" exists | Organization |
| AC-EF-11 | "The Bureau of Alcohol Tobacco and Firearms investigated the case." | No standalone "Firearms" or "Alcohol Tobacco" phantom entities | Single entity |

### Syntactic Position Variants (per demo feedback)

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-EF-12 | "The directive was issued by the Department of Homeland Security." | Entity "Department of Homeland Security" intact (passive/obl:agent position) | Organization |
| AC-EF-13 | "She works for Customs and Border Protection." | Entity "Customs and Border Protection" intact (PP object position) | Organization |
| AC-EF-14 | "The Department of Homeland Security's policy requires annual review." | Entity "Department of Homeland Security" intact (possessive position) | Organization |

### ISA MOA Sentences

| AC | Input (from cms-2303-dhs-data-exch.pdf) | Assert | Expected |
|----|----------------------------------------|--------|----------|
| AC-EF-15 | "CMS shall allow USCIS to monitor and review all records and documents under CMS control related to this Agreement." | "USCIS" extracted as entity (acronym, single token) | Organization |
| AC-EF-16 | "CMS and AEs may not deny an application based on a verification response that fails to confirm the applicant's status." | "CMS" and "AEs" extracted as separate entities — CDD must NOT lock this span | Two entities, not one |

**CDD negative-test rationale for AC-EF-16:** "CMS and AEs" is two standalone acronyms joined by coordination, not a single multi-word proper name. CDD must distinguish based on the pattern: a multi-word proper name has at least one non-acronym capitalized word on each side of the connector. "Customs [and] Border Protection" qualifies (multi-word, non-acronym). "CMS [and] AEs" does not — both sides are standalone acronyms with no surrounding capitalized words. If CDD doesn't encode this distinction, it will over-trigger on every "X and Y" coordination between acronyms in regulatory text.

### ComplexDesignatorDetector Integration

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-EF-17 | "Federal Emergency Management Agency coordinated the response." | Entity "Federal Emergency Management Agency" exists (detected by CDD, NOT in gazetteer) | Organization |
| AC-EF-18 | "The National Oceanic and Atmospheric Administration issued a warning." | Entity "National Oceanic and Atmospheric Administration" exists (CDD handles "and" inside proper name) | Organization |

### CDD Negative Tests (Must NOT Lock)

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-EF-28 | "FBI and CIA investigated the matter." | Two separate entities "FBI" and "CIA" — CDD does NOT lock as one span | Split preserved |
| AC-EF-29 | "Alice and Bob went to the park." | Two separate entities — CDD does NOT fire on non-proper-name coordination | Split preserved |

### Defensive Code Fixes

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-EF-19 | Any sentence with root-position NNP noun having `conj` verb child | `_handleCoordination()` is invoked (RC-2 fix) | Guard reached |
| AC-EF-20 | Any sentence with root-position noun and `conj` verb child | Entity span excludes the verb conjunct and its subtree (RC-3 fix) | Clean span |

### Ontology Match Integration

| AC | Input | Assert | Expected |
|----|-------|--------|----------|
| AC-EF-21 | "Customs and Border Protection enforces trade laws." with DHS ontology loaded | `ontologyMatch` on Tier 2 entity for CBP with `ontologyMatchIRI` | Match found |
| AC-EF-22 | "Department of Homeland Security issued the directive." with DHS ontology loaded | `ontologyMatch` on Tier 2 entity for DHS with `ontologyMatchIRI` | Match found |

### Non-Regression

| AC | Assert | Expected |
|----|--------|----------|
| AC-EF-23 | "CBP is a component of DHS." (copular — should NOT be affected) | Structural assertion exists with correct subject/object | No regression |
| AC-EF-24 | "Alice and Bob went to the park." (coordination SPLIT — two people) | Two separate entities: "Alice", "Bob" | Split preserved |
| AC-EF-25 | Full CI suite (14 suites) | 0 failures | Non-regression |
| AC-EF-26 | Modal detection tests (31) | 0 failures | Non-regression |
| AC-EF-27 | Tagger tests (141) + bundle tests (53) | 0 failures | Non-regression |

---

## TDD Implementation Sequence

### Cycle 1: ComplexDesignatorDetector integration (ship visible progress first)

**Red:** Write tests for AC-EF-01 through AC-EF-08, AC-EF-28, AC-EF-29. Most fail.

**Green:**
1. In `SemanticGraphBuilder._buildWithTreeExtractors()`, after Stage 4 (dep parse), call `ComplexDesignatorDetector.detect(tokens, tags)` to get locked spans
2. Pass locked spans to `TreeEntityExtractor.extract(depTree, { lockedSpans })`
3. In `extract()`: before Step 0 and Step 1, check if any extracted entity overlaps a locked span. If so, replace the fragmented entities with a single entity covering the locked span
4. Ensure CDD does not lock acronym-only coordination ("CMS and AEs", "FBI and CIA") — verify the pattern requires at least one non-acronym capitalized word on each side of the connector

**Rationale for CDD first:** The defensive fixes (RC-2, RC-3) alone don't fix the demo-blocking sentences — "Department of Homeland Security" still fragments because RC-4 (PP attachment) isn't addressed. CDD is the fix that actually makes the demo sentences work. CDD is already implemented and tested; the integration point is clean. Ship visible progress on the exact sentences that broke the demo, then harden.

### Cycle 2: Defensive fixes (RC-2 + RC-3) — hardening

**Red:** Write tests for AC-EF-19, AC-EF-20, AC-EF-24 (non-regression on split). Some may already pass from Cycle 1.

**Green:**
1. In `_collectEntitySpan()`: add VERB_TAGS check — exclude `conj` children tagged as verbs (RC-3)
2. In `extract()` Step 0: before calling `_buildEntity()` for root-position nouns, check for `conj` children and route through `_handleCoordination()` (RC-2)

These prevent future fragmentation for entities CDD doesn't catch (novel multi-word names not detected by surface form).

### Cycle 3: Additional agency names + syntactic variants

**Red:** Write tests for AC-EF-09 through AC-EF-14, AC-EF-17, AC-EF-18.

**Green:** Fix any remaining issues. CDD should handle most of these. Possessive position (AC-EF-14) may need special handling if the tokenizer splits the `'s`.

### Cycle 4: Ontology match integration

**Red:** Write tests for AC-EF-21, AC-EF-22.

**Green:** These should pass if Cycle 2 is correct — the ontology matcher already works on Tier 2 entities. The only requirement is that the entity exists as a node with a label the matcher can match against.

### Cycle 5: ISA MOA + non-regression

**Red/Green:** Write tests for AC-EF-15, AC-EF-16, AC-EF-23 through AC-EF-27. Run full CI suite.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| CDD over-detects: "Customs and Border" without "Protection" triggers false lock | CDD already requires full capitalized span with connectors. Partial spans don't match. Validate with negative tests. |
| CDD misses agencies with lowercase connectors: "Bureau of Alcohol..." — "of" is lowercase | CDD's `INTERNAL_CONNECTORS` includes "of", "and", "for", "the". Lowercase connectors within capitalized spans are handled. |
| Locked span conflicts with coordination split for real conjunctions | Only lock spans that are fully capitalized proper names with connectors. "Alice and Bob" has no capitalized connector context. CDD won't fire. |
| RC-3 fix (exclude verb conjuncts) breaks legitimate conj-noun entities | Only exclude conjuncts whose POS is in VERB_TAGS. Noun conjuncts ("cats and dogs") are preserved. Add AC-EF-24 as explicit non-regression. |
| POS tagger still mistaggs "enforces" as NNS | CDD pre-pass detects "Customs and Border Protection" before POS tagging matters. The entity boundary is locked by surface form. |
| "Department of Homeland Security" — parser splits at "of" | CDD detects the full 4-token span "Department of Homeland Security" as a complex designator. Locked span overrides parser fragmentation. |

---

## Related Issue: Copular Modal Gap (Out of Scope)

M13-01 from the modality test runner exposed a related architectural gap: "The patient must be in pain" produces no act node — `_handleCopular()` routes the sentence to a StructuralAssertion, and the modal `must` is lost entirely because `_handleCopular()` doesn't call `_detectModality()`. Any sentence with "must be", "shall be", "may be" + predicate adjective loses its modality. This is the same pattern as the entity fragmentation: the copular path bypasses infrastructure that only exists on the act path.

**Not in scope for this fix.** File as a separate work item — it requires `_handleCopular()` to detect modals from `aux` children and propagate them to the StructuralAssertion node (e.g., `tagteam:assertionModality: 'obligation'`).

---

## Diagnostic Notes

**AC-EF-01/02/03:** If these fail after CDD integration, check whether `ComplexDesignatorDetector.detect()` returns a span for "Customs and Border Protection". If it does but the entity still fragments, the issue is in span-locking in `TreeEntityExtractor`. If CDD doesn't detect it, check the tokenizer output and CDD's connector list.

**AC-EF-04/05:** "Department of Homeland Security" is the hardest case because the `of` preposition creates a genuine dependency boundary. CDD is the only reliable fix — parser corrections (RC-4) are fragile. If CDD detects the span, the entity should be correct regardless of parser structure.

**AC-EF-16/28/29:** Critical negative tests. CDD must NOT fire on acronym-only coordination ("CMS and AEs", "FBI and CIA") or non-proper-name coordination ("Alice and Bob"). The discriminator is: a multi-word proper name has at least one non-acronym capitalized word on each side of the connector. If CDD over-triggers here, every regulatory sentence with "X and Y" between agencies will produce a fused entity. Test these early in Cycle 1.
