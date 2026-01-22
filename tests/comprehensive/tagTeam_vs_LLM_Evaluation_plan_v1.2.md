## TagTeam vs. LLM Comparative Evaluation Plan v1.2

**Version**: 1.2 (FINAL)
**Date**: 2026-01-22
**Status**: Approved for Implementation
**Changes from v1.0**: Incorporated ambiguity resolution metrics, symbolic calibration definition, robustness dimension, Pareto frontier visualization, and nested modality test cases per architectural review.

---

### 1. Foundational Principles

#### 1.1 The Incommensurability Problem

TagTeam and LLMs are not doing the same thing when they "interpret" text. Any comparison must acknowledge this and define a **common evaluation space** where both systems' outputs can be meaningfully measured.

| Aspect | TagTeam | LLM |
|--------|---------|-----|
| **Paradigm** | Symbolic decomposition | Statistical pattern completion |
| **Output** | Structured graph with ontological commitments | Natural language or prompted JSON |
| **Commitments** | Explicit (every node typed, every relation named) | Implicit (embedded in weights) |
| **Provenance** | Complete (span → node → relation) | Absent (black box) |
| **Determinism** | Yes (same input → same output) | No (temperature, sampling) |
| **Ambiguity handling** | Preserves multiple readings | Selects most probable | [NEW]

**Principle 1**: We do not compare outputs directly. We compare **performance on well-defined tasks** where both systems can participate.

#### 1.2 Fairness Doctrine

LLMs are highly sensitive to prompting. An unfair comparison would use naive prompts that disadvantage the LLM.

**Principle 2**: LLMs receive **best-effort prompting** including:
- Clear task specification
- Relevant examples (few-shot)
- Chain-of-thought where beneficial
- Output format guidance
- Multiple attempts with best-of-N selection where appropriate

**Principle 3**: If a prompting technique exists that would improve LLM performance on a task, we must use it or document why we didn't.

#### 1.3 Dimension Isolation

**Principle 4**: Each test isolates a single dimension of interpretation quality. Compound tests that conflate multiple dimensions produce uninterpretable results.

#### 1.4 Structural Advantages Are Features

TagTeam has architectural properties (determinism, provenance, ontological grounding) that LLMs cannot match regardless of prompting. These are not "unfair advantages"—they are the value proposition.

**Principle 5**: We explicitly measure dimensions where TagTeam has **structural advantages** and report them as such. The goal is not to "beat" LLMs on their home turf, but to demonstrate where symbolic semantic parsing provides value that statistical methods cannot.

#### 1.5 Honest Reporting of Weaknesses

**Principle 6**: We report dimensions where LLMs outperform TagTeam. Credibility requires acknowledging limitations.

#### 1.6 Precision-Recall Characterization [NEW]

**Principle 7**: Where systems differ in kind (e.g., TagTeam preserves ambiguity, LLM resolves it), report **both precision-oriented and recall-oriented metrics**. Neither is objectively better; the use case determines which matters.

---

### 2. Evaluation Dimensions

The comparison spans eight primary dimensions, each measuring a distinct aspect of interpretation quality.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      COMPARATIVE EVALUATION DIMENSIONS                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   STRUCTURAL ADVANTAGES (TagTeam Expected to Win)                           │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│   │  CONSISTENCY    │  │  VERIFIABILITY  │  │   FACTUALITY    │            │
│   │                 │  │                 │  │                 │            │
│   │ Same input →    │  │ Can the         │  │ Only assert     │            │
│   │ same output?    │  │ interpretation  │  │ what's stated?  │            │
│   │                 │  │ be justified?   │  │                 │            │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                             │
│   ┌─────────────────┐                                                       │
│   │   EFFICIENCY    │                                                       │
│   │                 │                                                       │
│   │ Time, cost,     │                                                       │
│   │ resource use    │                                                       │
│   └─────────────────┘                                                       │
│                                                                             │
│   EMPIRICAL CONTESTS (Winner Uncertain)                                     │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│   │COMPOSITIONALITY │  │    COVERAGE     │  │  CALIBRATION    │            │
│   │                 │  │                 │  │                 │            │
│   │ Structure       │  │ Range of        │  │ Confidence vs.  │            │
│   │ determines      │  │ phenomena       │  │ accuracy        │            │
│   │ meaning?        │  │ handled?        │  │ alignment       │            │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                             │
│   ┌─────────────────┐                                                       │
│   │   ROBUSTNESS    │  [NEW]                                                │
│   │                 │                                                       │
│   │ Handling noisy, │                                                       │
│   │ malformed input │                                                       │
│   └─────────────────┘                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

#### 2.1 Consistency

**Definition**: Given identical input, does the system produce identical output?

**Why it matters**: Downstream systems depending on interpretation need predictability. Inconsistent interpretation is a reliability hazard.

**TagTeam expectation**: 100% consistency (deterministic by design)

**LLM expectation**: Variable (temperature-dependent, typically 70-95% semantic similarity across runs)

**Measurement approach**:
- Run N iterations on M sentences
- Measure output variance (exact match, semantic similarity, structural diff)
- Report consistency rate and variance distribution

**Classification**: Structural advantage (TagTeam)

---

#### 2.2 Compositionality

**Definition**: Does the system correctly interpret meaning that depends on syntactic structure rather than just lexical content?

**Why it matters**: Natural language meaning is compositional. "Dog bites man" ≠ "Man bites dog" despite identical words.

**Measurement approach**: Minimal pair testing
- Construct sentence pairs differing only in structure
- Verify system produces appropriately different interpretations
- Categories: argument structure, scope, attachment, binding, movement

**Killer Test Case: Nested Attribution Chains** [NEW]

This test specifically targets the "attitude flattening" failure mode common in LLMs:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     NESTED MODALITY TEST SPECIFICATION                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Input: "The witness denied that the suspect said he was at the bank."      │
│                                                                             │
│  REQUIRED STRUCTURE:                                                        │
│                                                                             │
│    ┌─────────────────────────────────────────────────────────────────┐     │
│    │  DENY (Agent: Witness)                                          │     │
│    │    │                                                            │     │
│    │    └──► Content:                                                │     │
│    │           ┌─────────────────────────────────────────────────┐   │     │
│    │           │  SAY (Agent: Suspect)                           │   │     │
│    │           │    │                                            │   │     │
│    │           │    └──► Content:                                │   │     │
│    │           │           ┌─────────────────────────────────┐   │   │     │
│    │           │           │  AT (Theme: Suspect?,           │   │   │     │
│    │           │           │      Location: Bank)            │   │   │     │
│    │           │           │  ActualityStatus: Attributed    │   │   │     │
│    │           │           └─────────────────────────────────┘   │   │     │
│    │           │  ActualityStatus: Denied                        │   │     │
│    │           └─────────────────────────────────────────────────┘   │     │
│    │  ActualityStatus: Actual                                        │     │
│    └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  SUCCESS CRITERIA:                                                          │
│  ✓ Three-level nesting preserved                                           │
│  ✓ "Suspect at bank" NOT asserted as fact                                  │
│  ✓ "Suspect said X" NOT asserted as fact                                   │
│  ✓ "Witness denied Y" IS asserted as fact                                  │
│  ✓ Pronoun "he" correctly linked (ambiguous: witness or suspect?)          │
│                                                                             │
│  LLM FAILURE MODES:                                                         │
│  ✗ Flattening: Reports "suspect was at bank" as fact                       │
│  ✗ Partial nesting: Captures denial but loses inner attribution            │
│  ✗ Polarity confusion: Reports suspect DID say he was at bank              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Additional Nested Modality Test Sentences**:

| Sentence | Nesting Depth | Key Challenge |
|----------|---------------|---------------|
| "The report suggests the CEO believed profits would rise." | 3 | suggestion → belief → future |
| "Sources claim the minister denied knowing about the leak." | 3 | claim → denial → knowledge |
| "The court found that the defendant had intended to deceive." | 3 | finding → intention → deception |
| "Experts doubt the study proves the treatment works." | 3 | doubt → proof → efficacy |
| "She remembered him saying he would never forget." | 3 | memory → speech → commitment |

**Classification**: Empirical test (TagTeam expected to win on structural preservation)

---

#### 2.3 Verifiability

**Definition**: Can the system's interpretation be traced to specific evidence in the source text?

**Why it matters**: In high-stakes domains (legal, medical, regulatory), interpretation must be auditable. "The AI said so" is insufficient.

**TagTeam expectation**: 100% verifiable (every node has span offset, every relation has linguistic justification)

**LLM expectation**: Limited (can be prompted to explain, but explanations are post-hoc rationalizations, not true provenance)

**Measurement approach**:
- Request interpretations with justifications from both systems
- Evaluate: Does justification point to actual text? Is the reasoning valid?
- Measure: Provenance completeness, justification accuracy

**Classification**: Structural advantage (TagTeam)

---

#### 2.4 Factuality Preservation

**Definition**: Does the system avoid asserting information not present in the source text?

**Why it matters**: Hallucination is the Achilles heel of LLMs. In semantic parsing, inventing relations is a category error.

**Sub-dimensions**:

| Sub-dimension | Description |
|---------------|-------------|
| **Hallucination resistance** | Does not add unstated relations |
| **Attitude preservation** | Distinguishes "X said P" from "P is true" |
| **Negation handling** | "Did not happen" ≠ "happened" |
| **Modality respect** | "Must happen" ≠ "did happen" |

**TagTeam expectation**: 100% factuality (only asserts what linguistic evidence supports)

**LLM expectation**: Variable (typically 80-95%, highly prompt-dependent)

**Measurement approach**:
- Probe with questions about unstated information
- Test attribution chains (who said what)
- Evaluate negation and modality handling
- Measure hallucination rate

**Classification**: Structural advantage (TagTeam)

---

#### 2.5 Coverage

**Definition**: What range of linguistic phenomena can the system handle?

**Why it matters**: A system that only handles simple declaratives has limited utility.

**Sub-dimensions**:

| Sub-dimension | Examples |
|---------------|----------|
| **Syntactic range** | Passives, clefts, relative clauses, coordination |
| **Semantic phenomena** | Quantifier scope, plurals, generics, intensionality |
| **Pragmatic phenomena** | Implicature, presupposition, speech acts |
| **Domain breadth** | Legal, medical, technical, informal |
| **Register tolerance** | Formal documents to social media |

**TagTeam expectation**: Defined by implementation; may have gaps

**LLM expectation**: Broad but shallow; handles many phenomena but may not represent them correctly

**Measurement approach**:
- Test suite spanning linguistic phenomena
- Measure success rate per phenomenon category
- Identify systematic gaps

**Ambiguity Resolution Sub-Metric** [NEW]

When sentences are genuinely ambiguous, TagTeam and LLMs behave differently:
- **TagTeam**: Preserves multiple readings (high recall of interpretations)
- **LLM**: Selects most probable reading (high precision on "intended" meaning)

Neither is objectively correct. We measure both:

| Metric | Definition | TagTeam Strength | LLM Strength |
|--------|------------|------------------|--------------|
| **Precision@1** | Accuracy of top/only reading | Lower (may not pick "common" reading) | Higher (trained on typical usage) |
| **Recall-of-Readings** | Coverage of valid interpretations | Higher (preserves ambiguity) | Lower (collapses to one) |
| **Ambiguity Detection** | Recognizes when input is ambiguous | Explicit (multiple parses) | Implicit (may not flag) |

**Example**:
```
Input: "I saw the man with the telescope."

TagTeam Output: 
  Reading 1: I used telescope to see man (PP attaches to VP)
  Reading 2: Man had telescope (PP attaches to NP)
  Ambiguity flagged: YES

LLM Output:
  "You observed a man who was holding a telescope."
  Ambiguity flagged: NO (selected one reading)

Evaluation:
  Precision@1: LLM wins IF Reading 2 is "correct" in context
  Recall-of-Readings: TagTeam wins (found both)
  Ambiguity Detection: TagTeam wins (flagged ambiguity)
```

**Principle 7 Application**: Report both metrics. Let use case determine which matters.

**Classification**: Empirical test (LLM may have broader coverage; TagTeam may have deeper handling)

---

#### 2.6 Efficiency

**Definition**: What are the computational costs of interpretation?

**Why it matters**: Cost determines scalability. A system that costs $0.10 per sentence cannot process millions of documents.

**Sub-dimensions**:

| Metric | TagTeam | LLM |
|--------|---------|-----|
| **Latency** | Milliseconds (local) | Seconds (API) |
| **Throughput** | High (parallelizable) | Limited (rate limits) |
| **Cost per interpretation** | Compute only | API fees |
| **Offline capability** | Yes | No (typically) |

**Cost-Latency Pareto Frontier Visualization** [NEW]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       COST-LATENCY PARETO FRONTIER                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Cost per 1K sentences ($)                                                  │
│       │                                                                     │
│  10.00│                                          ┌─────────────┐            │
│       │                                          │ GPT-4o      │            │
│       │                                          │ (Frontier)  │            │
│   5.00│                              ┌───────────┴─────────────┘            │
│       │                              │ Claude 3.5 Sonnet                    │
│       │                  ┌───────────┴─────────────┐                        │
│   1.00│                  │ Gemini 1.5 Pro          │                        │
│       │      ┌───────────┴─────────────────────────┘                        │
│   0.50│      │ GPT-4o-mini                                                  │
│       │      │                                                              │
│   0.10│──────┴───────────┐                                                  │
│       │ Claude 3.5 Haiku │                                                  │
│   0.01│──────────────────┴──┐                                               │
│       │ Llama 3.1 (local)   │                                               │
│  0.001│─────────────────────┴──────────────────────────────────────────     │
│       │ ★ TagTeam                                                           │
│       │   (compute only)                                                    │
│   0.00├─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬────     │
│       0        100       500      1000      2000      5000     10000        │
│                                                                             │
│                        Latency per sentence (ms)                            │
│                                                                             │
│  ★ = Pareto optimal for cost-sensitive, latency-sensitive applications     │
│                                                                             │
│  NOTE: LLMs may provide value that justifies cost (e.g., world knowledge)  │
│        This chart shows efficiency dimension only, not overall utility      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Classification**: Structural advantage (TagTeam)

---

#### 2.7 Calibration [REVISED]

**Definition**: When the system expresses confidence, does confidence correlate with accuracy?

**Why it matters**: A system that is confidently wrong is worse than one that expresses uncertainty.

**The Symbolic Calibration Problem** [NEW]

TagTeam's "confidence" is fundamentally different from LLM softmax probabilities. We must define a comparable confidence metric for symbolic systems.

**TagTeam Confidence Definition**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TAGTEAM CONFIDENCE SPECIFICATION                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Confidence = f(Mapping Completeness, Parse Quality, Ambiguity)             │
│                                                                             │
│  COMPONENT 1: Mapping Completeness (0-1)                                    │
│  ────────────────────────────────────────                                   │
│  What percentage of input tokens map to typed ontological entities?         │
│                                                                             │
│    mappingCompleteness = 1 - (unknownTokens / totalTokens)                  │
│                                                                             │
│    Example:                                                                 │
│    "The CEO announced record profits."                                      │
│    - "The" → determiner (structural, not mapped)                            │
│    - "CEO" → cco:Person with cco:OccupationRole ✓                          │
│    - "announced" → cco:CommunicativeAct ✓                                   │
│    - "record" → cco:Quality (superlative) ✓                                 │
│    - "profits" → cco:MonetaryAmount ✓                                       │
│    Completeness: 100% (all content words mapped)                            │
│                                                                             │
│    "The CEO announced glorbix profits."                                     │
│    - "glorbix" → UNKNOWN (no mapping)                                       │
│    Completeness: 80% (1 unknown / 5 content words)                          │
│                                                                             │
│  COMPONENT 2: Parse Quality (0-1)                                           │
│  ─────────────────────────────────                                          │
│  Did the dependency parse succeed? Were all required relations found?       │
│                                                                             │
│    parseQuality = (foundRelations / expectedRelations)                      │
│                   × (1 - parseErrorCount / sentenceLength)                  │
│                                                                             │
│  COMPONENT 3: Ambiguity Penalty (0-1)                                       │
│  ────────────────────────────────────                                       │
│  How many readings were produced? More readings = less confidence in any    │
│                                                                             │
│    ambiguityFactor = 1 / numberOfReadings                                   │
│                                                                             │
│  COMPOSITE CONFIDENCE:                                                      │
│  ─────────────────────                                                      │
│    confidence = mappingCompleteness × parseQuality × ambiguityFactor        │
│                                                                             │
│  CALIBRATION TARGET:                                                        │
│  ───────────────────                                                        │
│    When confidence = 0.8, accuracy should be ~80%                           │
│    (Accuracy = human agreement on interpretation correctness)               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Measurement approach**:
- Collect confidence scores from both systems
- Bucket by confidence level (0-0.2, 0.2-0.4, ..., 0.8-1.0)
- Measure accuracy within buckets (against human gold standard)
- Compute calibration metrics (ECE, reliability diagrams)

**Classification**: Empirical test (uncertain winner; neither system optimized for calibration)

---

#### 2.8 Robustness [NEW DIMENSION]

**Definition**: How does the system handle noisy, malformed, or non-standard input?

**Why it matters**: Real-world text is messy. OCR errors, transcription mistakes, typos, and ungrammatical writing are common. A system that fails on imperfect input has limited practical utility.

**The Robustness Trade-off**:

| Property | TagTeam | LLM |
|----------|---------|-----|
| **Design philosophy** | Expects well-formed input | Trained on internet-scale noise |
| **Failure mode** | Parse failure / partial output | Graceful degradation / hallucination |
| **Character** | High-precision / low-noise tolerance | High-recall / high-noise tolerance |

**Sub-dimensions**:

| Sub-dimension | Examples | TagTeam Risk | LLM Risk |
|---------------|----------|--------------|----------|
| **OCR noise** | "The c0mpany ann0unced" | Parse failure | Over-correction |
| **Typos** | "The compnay anounced" | Lexicon miss | Likely handles |
| **Ungrammatical** | "Company announce profit good" | Structure failure | Likely handles |
| **Fragments** | "Approved. Next steps?" | Incomplete parse | Likely handles |
| **Code-switching** | "The CEO said 效率提高了" | Coverage gap | May handle |
| **Domain jargon** | "The EBITDA exceeded guidance" | Ontology gap | Likely handles |

**Measurement approach**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ROBUSTNESS TEST PROTOCOL                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. BASELINE                                                                │
│     Parse clean, well-formed version of each test sentence                  │
│     Record: success rate, output quality                                    │
│                                                                             │
│  2. PERTURBATION                                                            │
│     Apply noise transformations at varying levels:                          │
│                                                                             │
│     Level 1 (5% noise):   1-2 typos per sentence                           │
│     Level 2 (10% noise):  OCR-style errors (0→O, l→1)                      │
│     Level 3 (20% noise):  Missing words, broken punctuation                │
│     Level 4 (50% noise):  Severe degradation (ASR transcript style)        │
│                                                                             │
│  3. EVALUATION                                                              │
│     For each noise level:                                                   │
│     - Success rate (did system produce output?)                             │
│     - Semantic preservation (does output match clean baseline?)             │
│     - Graceful degradation (if partial, how partial?)                       │
│                                                                             │
│  4. METRICS                                                                 │
│                                                                             │
│     Robustness Curve: Plot accuracy vs. noise level                        │
│     Area Under Curve: Single robustness score                              │
│     Failure Threshold: Noise level where accuracy drops below 50%          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Reporting Posture**:

This dimension explicitly characterizes the **precision-recall trade-off** between systems:

- **TagTeam**: "When TagTeam succeeds, it succeeds correctly. But it may refuse noisy input."
- **LLM**: "LLMs attempt all input, but may hallucinate on noisy text."

Neither is better in absolute terms. The use case determines which trade-off is preferable:
- **High-stakes, clean input** (legal contracts, edited documents): TagTeam's precision preferred
- **High-volume, noisy input** (social media, OCR archives): LLM's recall preferred

**Classification**: Empirical test (LLM expected to have higher noise tolerance; TagTeam expected to have higher precision when successful)

---

### 3. Test Corpus Design Principles

#### 3.1 Stratified Sampling

The test corpus must not over-represent any domain, register, or phenomenon.

**Principle 8**: Test corpus stratified by:
- Domain (≥10 domains, none >15% of corpus)
- Sentence complexity (simple, compound, complex)
- Linguistic phenomenon (systematic coverage of test suite categories)
- Source register (formal, informal, technical, conversational)
- **Input quality (clean, lightly noisy, heavily noisy)** [NEW]

#### 3.2 Adversarial Inclusion

**Principle 9**: Include cases specifically designed to expose known LLM weaknesses:
- Sentences requiring precise structural interpretation
- Nested propositional attitudes
- Negation and modality interactions
- Long-distance dependencies
- Garden path constructions

**Principle 10**: Include cases that may expose TagTeam weaknesses:
- Highly ambiguous sentences requiring world knowledge
- Figurative language, idioms, metaphor
- Elliptical constructions requiring pragmatic inference
- Domain-specific terminology outside ontology coverage
- **Noisy, malformed, and ungrammatical input** [NEW]

#### 3.3 Scale Requirements

| Dimension | Minimum Corpus Size | Rationale |
|-----------|---------------------|-----------|
| Consistency | 100 sentences × 10 runs | Statistical stability |
| Compositionality | 50 minimal pairs + 20 nested modality | Coverage of structural contrasts |
| Factuality | 100 sentences × 5 probes | Probe coverage |
| Coverage | 500+ sentences | Phenomenon sampling |
| Efficiency | 1000 sentences | Timing stability |
| Robustness | 100 sentences × 4 noise levels | Degradation curve | [NEW]

---

### 4. Methodology

#### 4.1 LLM Prompting Protocol

To ensure fairness, LLM prompts follow a standardized enhancement protocol:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LLM PROMPTING PROTOCOL                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. TASK SPECIFICATION                                                      │
│     • Clear description of what interpretation means for this task          │
│     • Explicit output format requirements                                   │
│     • Constraints (e.g., "only assert what is explicitly stated")           │
│                                                                             │
│  2. EXAMPLES (Few-Shot)                                                     │
│     • 3-5 worked examples demonstrating correct interpretation              │
│     • Examples span range of complexity                                     │
│     • Include edge cases                                                    │
│                                                                             │
│  3. CHAIN-OF-THOUGHT                                                        │
│     • For complex tasks, request step-by-step reasoning                     │
│     • "First identify entities, then relations, then verify each"           │
│                                                                             │
│  4. OUTPUT STRUCTURE                                                        │
│     • JSON schema matching evaluation requirements                          │
│     • Explicit fields for confidence, provenance                            │
│                                                                             │
│  5. SELF-VERIFICATION                                                       │
│     • "Review your answer and verify each claim against the text"           │
│     • "If uncertain, mark as uncertain rather than guessing"                │
│                                                                             │
│  6. AMBIGUITY INSTRUCTION [NEW]                                             │
│     • "If the sentence has multiple valid interpretations, list all"        │
│     • "Flag when you are selecting among ambiguous readings"                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 4.2 Output Projection

Both systems' outputs must be projected to a common schema for comparison.

**Principle 11**: Define projection functions explicitly:
- `projectTagTeam(output) → CommonSchema`
- `projectLLM(response) → CommonSchema`

The common schema is task-specific but must capture the evaluation-relevant features.

#### 4.3 Evaluation Metrics

| Dimension | Primary Metric | Secondary Metrics |
|-----------|----------------|-------------------|
| Consistency | Exact match rate | Semantic similarity variance |
| Compositionality | Minimal pair accuracy | Per-phenomenon breakdown, **nesting depth preservation** [NEW] |
| Verifiability | Provenance completeness | Justification validity |
| Factuality | Hallucination rate | Attitude preservation accuracy |
| Coverage | Phenomenon success rate | **Precision@1, Recall-of-Readings** [NEW] |
| Efficiency | Median latency | P99 latency, cost per 1K, **Pareto position** [NEW] |
| Calibration | Expected Calibration Error | Reliability diagram |
| Robustness | Area under robustness curve | Failure threshold | [NEW]

---

### 5. Evaluation Categories

We classify dimensions by the expected outcome:

#### 5.1 Structural Advantages (TagTeam Expected to Win)

These dimensions measure properties that emerge from TagTeam's architecture, not from training or tuning. LLMs cannot match these regardless of prompting.

| Dimension | Why Structural |
|-----------|----------------|
| **Consistency** | Deterministic algorithm vs. stochastic sampling |
| **Verifiability** | Explicit provenance vs. post-hoc rationalization |
| **Factuality** | Only asserts parsed content vs. generates likely continuations |
| **Efficiency** | Local compute vs. API calls |

**Evaluation posture**: Confirm the structural advantage holds. Report the margin.

#### 5.2 Empirical Contests (Winner Uncertain)

These dimensions depend on implementation quality and test corpus composition. Either system could win.

| Dimension | Tension |
|-----------|---------|
| **Compositionality** | TagTeam has explicit structure; LLMs have seen more examples |
| **Coverage** | LLMs handle breadth; TagTeam may handle depth better |
| **Calibration** | Neither system designed primarily for calibration |
| **Robustness** | LLMs trained on noise; TagTeam expects clean input | [NEW]

**Evaluation posture**: Run fair tests. Report winner per sub-dimension. Analyze why.

#### 5.3 Potential Weaknesses (TagTeam May Lose) [REVISED]

Honesty requires acknowledging where LLMs may outperform.

| Area | LLM Advantage | Mitigation / Framing |
|------|---------------|---------------------|
| **World knowledge integration** | LLMs have vast implicit knowledge | Report Precision@1 vs Recall; TagTeam preserves options |
| **Pragmatic inference** | LLMs may infer implicature better | Explicit limitation; future roadmap item |
| **Robustness to noise** | LLMs trained on messy data | Position as precision-recall trade-off |
| **Novel domain generalization** | LLMs may handle unseen domains | Explicit limitation; extensibility story |
| **Ambiguity resolution** | LLMs select probable reading | Report as feature (preserving ambiguity) not bug | [NEW]

**Evaluation posture**: Test these areas. If TagTeam loses, document the gap, characterize the trade-off, and indicate whether it's addressable.

---

### 6. Reporting Framework

#### 6.1 Scorecard Structure [REVISED]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TAGTEAM vs. LLM EVALUATION SCORECARD v1.2                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STRUCTURAL ADVANTAGES (Expected: TagTeam)                                  │
│  ══════════════════════════════════════════                                 │
│                                                                             │
│  Consistency        TagTeam: 100%      LLM: ____%     Margin: +____%       │
│  Verifiability      TagTeam: 100%      LLM: ____%     Margin: +____%       │
│  Factuality         TagTeam: ____%     LLM: ____%     Margin: ±____%       │
│  Efficiency         TagTeam: ____ms    LLM: ____ms    Speedup: ____x       │
│                     TagTeam: $____/1K  LLM: $____/1K  Savings: ____x       │
│                                                                             │
│  EMPIRICAL CONTESTS (Winner: Measured)                                      │
│  ═════════════════════════════════════                                      │
│                                                                             │
│  Compositionality   TagTeam: ____%     LLM: ____%     Winner: ____         │
│    - Arg structure  TagTeam: ____%     LLM: ____%                          │
│    - Scope          TagTeam: ____%     LLM: ____%                          │
│    - Attachment     TagTeam: ____%     LLM: ____%                          │
│    - Nested modal.  TagTeam: ____%     LLM: ____%     [KEY TEST]           │
│                                                                             │
│  Coverage           (see precision-recall breakdown below)                  │
│    - Precision@1    TagTeam: ____%     LLM: ____%     Winner: ____         │
│    - Recall-of-Read TagTeam: ____%     LLM: ____%     Winner: ____         │
│    - Ambig. Detect  TagTeam: ____%     LLM: ____%     Winner: ____         │
│                                                                             │
│  Calibration        TagTeam ECE: ____  LLM ECE: ____  Winner: ____         │
│                                                                             │
│  Robustness         (see noise-level breakdown below)                       │
│    - Clean (0%)     TagTeam: ____%     LLM: ____%                          │
│    - Light (5%)     TagTeam: ____%     LLM: ____%                          │
│    - Medium (20%)   TagTeam: ____%     LLM: ____%                          │
│    - Heavy (50%)    TagTeam: ____%     LLM: ____%                          │
│    - AUC            TagTeam: ____      LLM: ____      Winner: ____         │
│                                                                             │
│  TRADE-OFF CHARACTERIZATION                                                 │
│  ══════════════════════════                                                 │
│                                                                             │
│  TagTeam Profile:   High-Precision / Low-Noise / Full-Provenance           │
│  LLM Profile:       High-Recall / High-Noise / No-Provenance               │
│                                                                             │
│  Recommended for:                                                           │
│    TagTeam → Legal, regulatory, medical, audit-critical                    │
│    LLM     → Exploratory, high-volume, noise-tolerant                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.2 Narrative Requirements

Beyond the scorecard, the evaluation report must include:

1. **Executive Summary**: One paragraph with key findings
2. **Methodology Transparency**: Exact prompts used, corpus composition, any deviations from protocol
3. **Statistical Significance**: Confidence intervals, p-values where appropriate
4. **Failure Analysis**: Examples where each system failed, categorized by failure mode
5. **Trade-off Characterization**: Explicit statement of precision-recall posture [NEW]
6. **Limitations**: What the evaluation does and does not show
7. **Recommendations**: What the results imply for TagTeam development priorities
8. **Pareto Visualization**: Cost-latency frontier chart [NEW]

---

### 7. LLM Selection

**Principle 12**: Test against multiple LLMs to avoid vendor-specific conclusions.

| Tier | Models | Rationale |
|------|--------|-----------|
| **Frontier** | Claude 3.5 Sonnet, GPT-4o, Gemini 1.5 Pro | Best available performance |
| **Efficient** | Claude 3.5 Haiku, GPT-4o-mini | Cost-performance tradeoff |
| **Open** | Llama 3.1 70B, Mixtral 8x22B | Reproducibility, local deployment |

**Principle 13**: Report results per model. Aggregate only where patterns are consistent.

---

### 8. Anti-Patterns to Avoid

| Anti-Pattern | Why It's Wrong | Correct Approach |
|--------------|----------------|------------------|
| **Cherry-picking examples** | Proves nothing about general performance | Systematic corpus with stratified sampling |
| **Naive LLM prompts** | Unfairly disadvantages LLM | Best-effort prompting protocol |
| **Conflating dimensions** | Unclear what's being measured | One dimension per test |
| **Ignoring LLM strengths** | Undermines credibility | Test potential weakness areas |
| **Exact string matching** | Over-penalizes semantic equivalents | Semantic similarity metrics |
| **Single LLM** | Results may not generalize | Multiple models, multiple tiers |
| **No confidence intervals** | Point estimates mislead | Report uncertainty |
| **Binary "winner" framing** | Obscures trade-offs | Characterize precision-recall posture | [NEW]
| **Ignoring robustness** | Real-world input is messy | Include noise-level analysis | [NEW]

---

### 9. Success Criteria

The evaluation succeeds if it produces **actionable, credible evidence** that:

1. **Confirms structural advantages**: TagTeam demonstrably wins on consistency, verifiability, factuality, efficiency
2. **Characterizes empirical performance**: Clear picture of compositionality and coverage relative to LLMs
3. **Documents trade-offs**: Explicit precision-recall characterization for coverage and robustness [NEW]
4. **Identifies improvement priorities**: Where TagTeam underperforms, what would fix it
5. **Withstands scrutiny**: Methodology is transparent and reproducible

**Principle 14**: The evaluation should be publishable. It should withstand review by skeptics of both symbolic and neural approaches.

---

### 10. Implementation Phases

| Phase | Scope | Deliverable |
|-------|-------|-------------|
| **Phase 1** | Consistency + Efficiency | Baseline structural advantage metrics |
| **Phase 2** | Factuality (hallucination, attitudes, **nested modality**) | Factuality preservation evidence |
| **Phase 3** | Compositionality (minimal pairs, **attribution chains**) | Structural interpretation comparison |
| **Phase 4** | Coverage (phenomenon sweep, **ambiguity metrics**) | Gap analysis with trade-off characterization |
| **Phase 5** | Robustness (noise-level analysis) | Precision-recall posture documentation | [NEW]
| **Phase 6** | Full report + failure analysis + Pareto visualization | Publication-ready evaluation |

---

### 11. Summary of Principles

| # | Principle |
|---|-----------|
| 1 | Compare performance on tasks, not outputs directly |
| 2 | LLMs receive best-effort prompting |
| 3 | Use known prompting improvements or document why not |
| 4 | Isolate dimensions; don't conflate |
| 5 | Structural advantages are features, not unfair |
| 6 | Report dimensions where LLMs outperform |
| 7 | Report both precision and recall metrics for trade-off dimensions | [NEW]
| 8 | Stratify corpus by domain, complexity, phenomenon, **input quality** |
| 9 | Include adversarial cases for LLMs |
| 10 | Include adversarial cases for TagTeam |
| 11 | Define projection functions explicitly |
| 12 | Test multiple LLMs |
| 13 | Report per-model; aggregate carefully |
| 14 | Evaluation should be publishable |
