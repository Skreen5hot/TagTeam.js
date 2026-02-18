# Evaluation Report — Phase 4

**Date:** 2026-02-17
**Pipeline:** Tree extractors (Phases 0–3B)
**Gold set:** 200 sentences across 8 subsets
**Evaluator:** `tests/gold/evaluate.js`

---

## 1. Aggregate Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Entity boundary F1 | >= 88% | **90.3%** | **Met** |
| Role assignment F1 | >= 85% | **59.3%** | Not met (baseline) |
| Copular detection | >= 95% | **96.9%** | **Met** |
| Organizational entity F1 | >= 85% | **93.5%** | **Met** |
| Coordination split | >= 80% | **80.0%** | **Met** |

### Entity Boundary Detail

| | Value |
|---|---|
| Precision | 91.3% |
| Recall | 89.4% |
| F1 | 90.3% |
| TP / FP / FN | 438 / 42 / 52 |

### Role Assignment Detail

| | Value |
|---|---|
| Precision | 51.6% |
| Recall | 69.8% |
| F1 | 59.3% |
| TP / FP / FN | 270 / 253 / 117 |

---

## 2. Per-Subset Breakdown

| Subset | Sentences | Entity F1 | Entity P/R | Role F1 | Role P/R |
|--------|-----------|-----------|------------|---------|----------|
| organizational | 43 | 93.5% | 97.7% / 89.6% | 58.2% | 47.5% / 75.0% |
| cbp-domain | 60 | 90.5% | 93.7% / 87.5% | 62.5% | 51.6% / 79.2% |
| general | 30 | 96.6% | 95.9% / 97.2% | 72.0% | 60.8% / 88.1% |
| adversarial | 32 | 86.4% | 78.1% / 96.7% | 55.0% | 50.5% / 60.3% |
| coordination | 20 | 81.6% | 90.9% / 74.1% | 47.9% | 50.0% / 46.0% |
| stative-passive | 10 | 100.0% | 100.0% / 100.0% | 58.8% | 43.5% / 90.9% |
| three-way-coord | 5 | 82.4% | 100.0% / 70.0% | 25.0% | 37.5% / 18.8% |

### Observations

- **General English** has the highest role F1 (72.0%) — simple SVO patterns dominate, confirming the pipeline handles prototypical clauses well.
- **Three-way coordination** has the lowest role F1 (25.0%) — the tree pipeline splits coordinated NPs into entities correctly (82.4% entity F1) but fails to assign each conjunct the shared role.
- **Stative-passive** has high recall (90.9%) but low precision (43.5%) — stative patterns produce spurious Agent roles from copular verbs.
- **Adversarial** entity recall is high (96.7%) but precision is low (78.1%) — PP decomposition over-generates entities from nested prepositional phrases.

---

## 3. Role F1 Gap Analysis

**Phase 4 baseline: 59.3%. Spec target: 85%. Gap: 25.7 points.**

### 3.1 Per-Role F1

| Role | Gold | Extracted | Matched | Precision | Recall | F1 |
|------|------|-----------|---------|-----------|--------|----|
| Agent | 177 | 329 | 122 | 37.1% | 68.9% | 48.2% |
| Patient | 165 | 150 | 128 | 85.3% | 77.6% | 81.3% |
| Recipient | 23 | 1 | 1 | 100.0% | 4.3% | 8.3% |
| Location | 8 | 15 | 5 | 33.3% | 62.5% | 43.5% |
| Goal | 6 | 13 | 6 | 46.2% | 100.0% | 63.2% |
| Instrument | 4 | 8 | 4 | 50.0% | 100.0% | 66.7% |
| Source | 4 | 4 | 4 | 100.0% | 100.0% | 100.0% |
| Beneficiary | 0 | 3 | 0 | 0.0% | — | 0.0% |

### 3.2 Root Cause Analysis

The 25.7-point gap has two primary drivers:

#### Driver 1: Agent Over-Generation (estimated 15–18 points)

**Symptom:** 329 Agent roles extracted vs. 177 in gold — 152 spurious assignments.
**Impact:** Agent precision is only 37.1%, dragging overall precision to 51.6%.

**Root cause:** The tree pipeline assigns Agent to every `nsubj` dependent of every verb. This includes:
- Copular subjects ("CBP **is** a component" → "CBP" gets Agent of "is")
- Stative subjects ("The building **contains** offices" → "building" gets Agent of "contains")
- Expletive subjects and other non-agentive patterns

**Fix path (targeted):** Add verb-class filtering to `TreeRoleMapper`:
1. Skip Agent assignment for copular verbs (be, become, seem, appear, remain)
2. Skip Agent assignment for stative verbs (contain, include, consist, belong, exist, have)
3. Only assign Agent when verb is classified as dynamic/agentive

**Estimated improvement:** Removing ~100 spurious Agent roles would raise Agent precision from 37% to ~70% and overall role F1 from 59% to ~70%.

#### Driver 2: Recipient Near-Zero Recall (estimated 5–7 points)

**Symptom:** Only 1 of 23 Recipient roles detected (4.3% recall).
**Impact:** 22 missed Recipient assignments → FN increase.

**Root cause:** The tree pipeline assigns Recipient only when specific oblique role properties (`cco:has_recipient`) are present. The `TreeRoleMapper` currently maps `iobj` to Patient rather than Recipient, and `obl` recipients are only detected for a small set of verb-sensitive preposition mappings.

**Confusion matrix evidence:**
- 11 gold Recipients misclassified as Patient (entity matched, wrong role)
- 6 gold Recipients misclassified as Agent
- 5 gold Recipients misclassified as Goal

**Fix path (targeted):**
1. Map `iobj` dependency relation to Recipient role (ditransitive: "gave the patient medication")
2. Extend verb-sensitive "to" mapping to cover more transfer/communication verbs
3. Add "on" → Recipient for medical-intervention verbs

**Estimated improvement:** Recovering 15–18 of the 22 missed Recipients would add ~3% recall and ~4% F1.

#### Driver 3: Coordination Role Distribution (estimated 3–5 points)

**Symptom:** Three-way coordination role F1 is 25.0%; general coordination is 47.9%.
**Impact:** Coordinated subjects/objects don't all receive the shared role.

**Root cause:** When "Alice, Bob, and Carol reviewed the report" is parsed, the conjuncts are extracted as separate entities but only the first (or head) conjunct receives the Agent role. The `conj` dependents are not assigned the same role as their head.

**Fix path (targeted):** After role assignment, propagate roles from head conjunct to all `conj` dependents sharing the same verb.

**Estimated improvement:** +3–5% role F1 from coordination subset alone.

### 3.3 Role Confusion Matrix (Top Misassignments)

| Extracted As | Should Be | Count | Pattern |
|-------------|-----------|-------|---------|
| Agent | SPURIOUS | 197 | Copular/stative subjects wrongly get Agent |
| Patient | Recipient | 11 | Indirect objects classified as Patient |
| Location | SPURIOUS | 10 | PP locations not in gold annotations |
| Patient | SPURIOUS | 7 | Over-extraction from PP decomposition |
| Agent | Recipient | 6 | Subject of ditransitive misclassified |
| Goal | Recipient | 5 | "to X" mapped as Goal instead of Recipient |
| Patient | Agent | 4 | Passive voice reversal error |
| Beneficiary | SPURIOUS | 3 | No gold Beneficiary roles in test set |
| Instrument | SPURIOUS | 3 | Over-extraction from "with" PPs |

### 3.4 Per-Pattern Role F1

| Pattern | Sentences | Role F1 | Notes |
|---------|-----------|---------|-------|
| svo | 40 | 68.3% | Best performing structural pattern |
| pp | 13 | 72.3% | PP role mapping working well |
| passive | 24 | 62.0% | High recall (86%) but low precision (48%) |
| ditransitive | 10 | 45.9% | Recipient/iobj mapping gap |
| coordination | 25 | 43.3% | Role distribution to conjuncts missing |
| copular | 32 | 0.0% | No roles expected, but spurious Agent generated |
| relative-clause | 8 | 35.3% | Embedded clause role assignment poor |
| three-way | 5 | 25.0% | Worst performing — architectural gap |
| stative | 5 | 0.0% | Stative verbs generating spurious Agent |

---

## 4. Improvement Roadmap

### Phase 5 Targets (estimated achievable with targeted fixes)

| Fix | Estimated F1 Gain | Effort |
|-----|-------------------|--------|
| Copular/stative Agent suppression | +10–12 points | Small (verb list + filter) |
| `iobj` → Recipient mapping | +3–4 points | Small (1 mapping change) |
| Coordination role propagation | +3–5 points | Medium (graph traversal) |
| Verb-sensitive "to" expansion | +1–2 points | Small (verb list expansion) |
| **Total estimated** | **+17–23 points** | |
| **Projected Role F1** | **76–82%** | |

### Beyond Phase 5 (requires architectural changes)

| Fix | Estimated F1 Gain | Effort |
|-----|-------------------|--------|
| Relative clause role scoping | +2–3 points | Large (clause boundary detection) |
| Multi-clause coordination | +1–2 points | Large (cross-clause analysis) |
| VerbNet frame-based role assignment | +3–5 points | Large (lexical resource integration) |
| **Total estimated** | **+6–10 points** | |
| **Projected Role F1** | **82–92%** | |

---

## 5. Entity Type Analysis

### Entity Extraction Strengths
- **Simple SVO:** 100% entity F1 across most SVO sentences
- **Passive voice:** 100% entity F1 (stative-passive subset)
- **CBP organizational:** 93.5% entity F1 — proper nouns and agency names handled well
- **General English:** 96.6% entity F1 — highest across all subsets

### Entity Extraction Weaknesses
- **Coordination recall:** 74.1% — missing conjuncts in "X, Y, and Z" patterns
- **Adversarial precision:** 78.1% — PP decomposition creates spurious entities from nested PPs
- **Three-way coord recall:** 70.0% — third conjunct often missed

---

## 6. Two-Tier ICE Structural Integrity

| Test Suite | Tests | Status |
|------------|-------|--------|
| Two-tier ICE tests | 23/23 | **All passing** |
| Path isolation (format) | 4/4 | **All passing** |
| Path isolation (shared state) | 2/2 | **All passing** |

The Two-Tier Information Content Entity architecture correctly maintains:
- Tier 1: Discourse referents (`tagteam:DiscourseReferent`) with `bfo:Entity` typing
- Tier 2: Ontological classifications (`owl:NamedIndividual`) linked via `cco:is_about`
- Pipeline isolation: Tree and legacy pipelines produce structurally distinct output

---

## 7. Conclusion

Phase 4 establishes a solid evaluation baseline for the tree pipeline:

- **Entity extraction is production-ready** at 90.3% F1, exceeding the 88% target.
- **Role assignment requires targeted work** — the 59.3% baseline is 25.7 points below the 85% spec target, but the gap analysis identifies three specific, fixable root causes that account for an estimated 17–23 points.
- **The gap is not architectural** — it stems from missing verb-class filters and incomplete role mapping rules, not from fundamental limitations of the dependency-based approach.

With the targeted fixes identified in Section 4, Phase 5 should achieve 76–82% role F1. Reaching the 85% spec target will additionally require VerbNet frame integration or equivalent lexical resource work.
