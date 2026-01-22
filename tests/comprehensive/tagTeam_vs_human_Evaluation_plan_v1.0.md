## TagTeam vs. Human Comparative Evaluation Plan v1.0

**Version**: 1.0
**Date**: 2026-01-22
**Status**: Draft for Review
**Purpose**: Establish principles, dimensions, and methodology for rigorous comparison of TagTeam semantic parsing against human interpretation as the gold standard.

---

### 1. Foundational Principles

#### 1.1 The Measurement Problem

Human interpretation is the gold standard for meaning—but it is **not directly observable**. We cannot open a person's head and extract their semantic representation. We can only observe **behavioral proxies**: answers to questions, annotations on text, judgments about paraphrases, etc.

This creates a fundamental challenge: we are not comparing TagTeam to "human interpretation" but to **human performance on interpretation-eliciting tasks**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     THE INTERPRETATION MEASUREMENT PROBLEM                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                        ┌─────────────────────┐                              │
│                        │  TRUE INTERPRETATION │                              │
│                        │  (Unobservable)      │                              │
│                        └──────────┬──────────┘                              │
│                                   │                                         │
│                                   │ Elicitation                             │
│                                   │ (introduces noise)                      │
│                                   ▼                                         │
│     ┌─────────────────────────────────────────────────────────┐            │
│     │              OBSERVABLE BEHAVIORS                        │            │
│     │                                                          │            │
│     │  • Entity annotations    • Relation labels              │            │
│     │  • Paraphrase judgments  • Inference decisions          │            │
│     │  • Question answers      • Ambiguity identifications    │            │
│     │  • Temporal orderings    • Factuality ratings           │            │
│     └─────────────────────────────────────────────────────────┘            │
│                                   │                                         │
│                                   │ Comparison                              │
│                                   ▼                                         │
│     ┌─────────────────────────────────────────────────────────┐            │
│     │              TAGTEAM OUTPUT                              │            │
│     │                                                          │            │
│     │  Projected to same annotation schema                     │            │
│     └─────────────────────────────────────────────────────────┘            │
│                                                                             │
│  KEY INSIGHT: We compare TagTeam to human TASK PERFORMANCE,                │
│               not to human UNDERSTANDING (which is inaccessible).          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Principle 1**: We compare TagTeam output to human annotations on well-defined tasks, not to an abstract notion of "human understanding."

#### 1.2 The Inter-Annotator Agreement Ceiling

Humans disagree with each other. This disagreement is **not noise to be eliminated** but **signal about the limits of the task**. If humans agree only 80% of the time on a task, no system can be expected to exceed 80% agreement with humans.

**Principle 2**: Human-human agreement defines the **ceiling** for TagTeam-human agreement. Achieving parity with inter-annotator agreement is achieving human-level performance.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AGREEMENT CEILING FRAMEWORK                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Human-Human Agreement (κ_HH)                                               │
│  ═══════════════════════════                                                │
│  Measures: How much do humans agree with each other?                        │
│  Interpretation: Upper bound on achievable system-human agreement           │
│                                                                             │
│  TagTeam-Human Agreement (κ_TH)                                             │
│  ══════════════════════════════                                             │
│  Measures: How much does TagTeam agree with human consensus?                │
│  Interpretation: System performance relative to ceiling                     │
│                                                                             │
│  EVALUATION LOGIC:                                                          │
│                                                                             │
│    If κ_TH ≈ κ_HH  →  TagTeam performs at human level                      │
│    If κ_TH < κ_HH  →  TagTeam underperforms; gap = κ_HH - κ_TH             │
│    If κ_TH > κ_HH  →  Suspicious (possible annotation artifact)            │
│                                                                             │
│  EXAMPLE:                                                                   │
│                                                                             │
│    Task: Entity type annotation                                             │
│    κ_HH = 0.82 (humans agree 82% of the time)                              │
│    κ_TH = 0.79 (TagTeam agrees with humans 79% of the time)                │
│                                                                             │
│    Gap: 0.03 (3 percentage points)                                         │
│    Interpretation: TagTeam achieves 96% of human ceiling                   │
│                    (0.79 / 0.82 = 0.96)                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Principle 3**: Report TagTeam performance as **percentage of human ceiling**, not raw accuracy.

#### 1.3 Task Design Determines What We Measure

Different tasks elicit different aspects of interpretation. Entity annotation measures referent identification; paraphrase judgment measures semantic equivalence; inference tasks measure entailment reasoning.

**Principle 4**: Select tasks that map to TagTeam's capabilities and claims. Do not evaluate TagTeam on tasks it is not designed to perform.

#### 1.4 Annotation Quality Is Paramount

Human annotations are only useful if they are:
- **Consistent**: Same annotator gives same answer on equivalent items
- **Calibrated**: Annotators understand the task as intended
- **Representative**: Annotators reflect the target user population

**Principle 5**: Invest heavily in annotator training, quality control, and task design. Poor annotations produce meaningless comparisons.

#### 1.5 Expert vs. Crowd Annotators

| Annotator Type | Strengths | Weaknesses | Use Case |
|----------------|-----------|------------|----------|
| **Linguistic experts** | High precision, consistent application of guidelines | Expensive, slow, may over-systematize | Complex phenomena, gold standard creation |
| **Trained annotators** | Balance of quality and scale | Requires training investment | Main annotation workforce |
| **Crowd workers** | Fast, cheap, diverse | Variable quality, limited training | Simple tasks, large-scale validation |
| **Domain experts** | Domain knowledge | May not know linguistics | Domain-specific content |

**Principle 6**: Match annotator expertise to task complexity. Use experts for hard tasks, crowd for simple tasks.

#### 1.6 The Elicitation Bias Problem

How we ask questions affects the answers. Leading questions, ambiguous instructions, and format constraints all introduce bias.

**Principle 7**: Design elicitation instruments to minimize bias. Pilot test with think-aloud protocols. Revise based on annotator confusion.

---

### 2. Evaluation Dimensions

The human comparison spans six primary dimensions, each requiring different annotation protocols.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 HUMAN COMPARISON EVALUATION DIMENSIONS                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   STRUCTURAL EXTRACTION (Does TagTeam find what humans find?)               │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│   │    ENTITY       │  │    RELATION     │  │     EVENT       │            │
│   │  RECOGNITION    │  │   EXTRACTION    │  │   DETECTION     │            │
│   │                 │  │                 │  │                 │            │
│   │ Who/what is     │  │ How are         │  │ What happened?  │            │
│   │ mentioned?      │  │ entities        │  │ Who             │            │
│   │                 │  │ connected?      │  │ participated?   │            │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                             │
│   SEMANTIC JUDGMENT (Does TagTeam judge as humans judge?)                   │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│   │   FACTUALITY    │  │   TEMPORAL      │  │   INFERENCE     │            │
│   │   ASSESSMENT    │  │   ORDERING      │  │   VALIDITY      │            │
│   │                 │  │                 │  │                 │            │
│   │ Fact vs.        │  │ What order      │  │ Does X entail   │            │
│   │ claimed vs.     │  │ did events      │  │ Y?              │            │
│   │ hypothetical?   │  │ occur?          │  │                 │            │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                             │
│   META-EVALUATION (Do humans prefer TagTeam's interpretations?)             │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │              INTERPRETATION QUALITY JUDGMENT                     │      │
│   │                                                                  │      │
│   │   Given a sentence and two interpretations (TagTeam vs. other), │      │
│   │   which does the human prefer?                                   │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

#### 2.1 Entity Recognition

**Definition**: Do TagTeam and humans identify the same entities in text?

**Why it matters**: Entity extraction is foundational. If TagTeam misses entities or hallucinates them, downstream analysis fails.

**Annotation task**: Mark all entity mentions in text; assign type labels.

**Comparison metrics**:

| Metric | Definition |
|--------|------------|
| **Span F1** | Overlap between TagTeam and human entity spans |
| **Type accuracy** | Given matching spans, do types agree? |
| **Mention-level agreement** | Exact match on span boundaries |
| **Entity-level agreement** | Do coreference chains match? |

**Human ceiling**: Typically κ = 0.75-0.90 depending on type granularity

---

#### 2.2 Relation Extraction

**Definition**: Do TagTeam and humans identify the same relations between entities?

**Why it matters**: Relations encode the semantic structure. "John hired Mary" vs. "Mary hired John" differs only in relation direction.

**Annotation task**: Given entity pairs, label the relation (if any).

**Comparison metrics**:

| Metric | Definition |
|--------|------------|
| **Relation F1** | Precision/recall on relation triples |
| **Relation type accuracy** | Given correct entity pair, is relation type correct? |
| **Directionality accuracy** | Is argument order correct? |

**Human ceiling**: Typically κ = 0.65-0.85 depending on relation inventory

---

#### 2.3 Event Detection

**Definition**: Do TagTeam and humans identify the same events and their participants?

**Why it matters**: Events are the backbone of narrative understanding. Missing events means missing what happened.

**Annotation task**: Mark event triggers; identify participants and their roles.

**Comparison metrics**:

| Metric | Definition |
|--------|------------|
| **Event trigger F1** | Overlap on event-denoting expressions |
| **Role F1** | Correct identification of agent, patient, etc. |
| **Event type accuracy** | Classification of event type |

**Human ceiling**: Typically κ = 0.70-0.85

---

#### 2.4 Factuality Assessment

**Definition**: Do TagTeam and humans agree on whether propositions are presented as fact, claimed, hypothetical, etc.?

**Why it matters**: This is TagTeam's key differentiator vs. LLMs. If humans and TagTeam agree on factuality, TagTeam is providing value.

**Annotation task**: For each proposition, rate its factuality status.

**Factuality scale**:

| Status | Definition | Example |
|--------|------------|---------|
| **Fact** | Presented as definitely true | "The company announced profits." |
| **Probable** | Presented as likely true | "The company probably announced profits." |
| **Possible** | Presented as possibly true | "The company may have announced profits." |
| **Claimed** | Attributed to a source | "The CEO said profits increased." |
| **Doubted** | Presented with skepticism | "The dubious claim that profits increased..." |
| **Negated** | Presented as definitely false | "The company did not announce profits." |
| **Hypothetical** | Presented as counterfactual | "If the company had announced profits..." |

**Comparison metrics**:

| Metric | Definition |
|--------|------------|
| **Factuality κ** | Cohen's kappa on factuality labels |
| **Binary fact/non-fact F1** | Simplified binary classification |
| **Attitude holder accuracy** | Correct identification of who claims what |

**Human ceiling**: Typically κ = 0.60-0.80 (factuality is genuinely hard for humans)

---

#### 2.5 Temporal Ordering

**Definition**: Do TagTeam and humans agree on the temporal sequence of events?

**Why it matters**: Correct temporal ordering is essential for narrative understanding, legal reasoning, and causal inference.

**Annotation task**: Given event pairs, indicate temporal relation (before, after, during, overlaps, etc.)

**Comparison metrics**:

| Metric | Definition |
|--------|------------|
| **Temporal relation κ** | Agreement on Allen interval relations |
| **Ordering accuracy** | Given events A, B: is A<B, A>B, or A=B correct? |
| **Timeline reconstructability** | Can a consistent timeline be built from annotations? |

**Human ceiling**: Typically κ = 0.65-0.80

---

#### 2.6 Inference Validity

**Definition**: Do TagTeam's interpretations support the same inferences humans make?

**Why it matters**: The ultimate test of interpretation quality is whether it supports correct reasoning.

**Annotation task**: Given premise and hypothesis, judge entailment (entails, contradicts, neutral).

**Comparison approach**:
1. Parse premise with TagTeam
2. Derive inferences from TagTeam graph
3. Compare TagTeam inferences to human judgments

**Comparison metrics**:

| Metric | Definition |
|--------|------------|
| **Inference accuracy** | Agreement on entailment judgments |
| **Precision** | Of inferences TagTeam supports, how many do humans support? |
| **Recall** | Of inferences humans support, how many does TagTeam support? |

**Human ceiling**: Typically κ = 0.75-0.90 on clean entailment datasets

---

#### 2.7 Interpretation Quality Judgment (Meta-Evaluation)

**Definition**: When shown TagTeam's interpretation alongside alternatives, do humans prefer TagTeam?

**Why it matters**: This is the holistic evaluation—not whether TagTeam matches humans on specific tasks, but whether its overall interpretation is useful and accurate.

**Annotation task**: Preference judgment between interpretations.

**Protocol**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INTERPRETATION PREFERENCE PROTOCOL                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STIMULUS:                                                                  │
│  ─────────                                                                  │
│  Sentence: "The witness denied that the suspect said he was at the bank."  │
│                                                                             │
│  Interpretation A: [TagTeam output, rendered as natural language]          │
│  "The witness made a denial. The content of the denial is an attributed    │
│   statement by the suspect. The suspect's statement claims that the        │
│   suspect (or possibly the witness) was located at the bank. The           │
│   location claim is not asserted as fact."                                 │
│                                                                             │
│  Interpretation B: [LLM output or baseline]                                │
│  "The witness denied something the suspect said about being at the bank."  │
│                                                                             │
│  QUESTIONS:                                                                 │
│  ──────────                                                                 │
│  1. Which interpretation more accurately captures the meaning?             │
│     ○ A is better  ○ B is better  ○ About equal                           │
│                                                                             │
│  2. Which interpretation is more complete?                                  │
│     ○ A is better  ○ B is better  ○ About equal                           │
│                                                                             │
│  3. Which interpretation would be more useful for legal analysis?          │
│     ○ A is better  ○ B is better  ○ About equal                           │
│                                                                             │
│  4. [Optional] Briefly explain your preference.                            │
│     _______________________________________________________________        │
│                                                                             │
│  DESIGN CONTROLS:                                                           │
│  ────────────────                                                           │
│  • Randomize A/B assignment (TagTeam not always A)                         │
│  • Blind annotators to system identity                                     │
│  • Include attention checks                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Comparison metrics**:

| Metric | Definition |
|--------|------------|
| **Win rate** | % of items where TagTeam preferred |
| **Tie rate** | % of items judged equal |
| **Preference strength** | Distribution of preference magnitude |

---

### 3. Agreement Metrics

#### 3.1 Primary Metrics

| Metric | Use Case | Interpretation |
|--------|----------|----------------|
| **Cohen's κ** | Two annotators, categorical | κ > 0.8 excellent, 0.6-0.8 good, 0.4-0.6 moderate |
| **Fleiss' κ** | Multiple annotators, categorical | Same scale as Cohen's κ |
| **Krippendorff's α** | Multiple annotators, any scale | α > 0.8 reliable, 0.67-0.8 tentative |
| **Span F1** | Entity/event extraction | Standard precision/recall/F1 |
| **Kendall's τ** | Ordering tasks | τ > 0.8 strong agreement |

#### 3.2 Agreement Calculation Framework

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      AGREEMENT CALCULATION FRAMEWORK                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STEP 1: Collect Human Annotations                                          │
│  ──────────────────────────────────                                         │
│  • Minimum 3 annotators per item (5 preferred for noisy tasks)             │
│  • Overlap subset for inter-annotator agreement calculation                 │
│                                                                             │
│  STEP 2: Calculate Human-Human Agreement (κ_HH)                             │
│  ───────────────────────────────────────────────                            │
│  • Pairwise κ for all annotator pairs                                      │
│  • Report mean and standard deviation                                       │
│  • This is the CEILING                                                      │
│                                                                             │
│  STEP 3: Establish Gold Standard                                            │
│  ────────────────────────────────                                           │
│  Option A: Majority vote (simple, scalable)                                │
│  Option B: Adjudicated gold (expert resolves disagreements)                │
│  Option C: Probabilistic gold (model annotator reliability)                │
│                                                                             │
│  STEP 4: Project TagTeam Output                                             │
│  ───────────────────────────────                                            │
│  • Convert TagTeam JSON-LD to annotation format                            │
│  • Ensure schema alignment with human annotations                          │
│                                                                             │
│  STEP 5: Calculate TagTeam-Human Agreement (κ_TH)                           │
│  ─────────────────────────────────────────────────                          │
│  Option A: TagTeam vs. gold standard                                       │
│  Option B: TagTeam vs. each human (then average)                           │
│                                                                             │
│  STEP 6: Compare to Ceiling                                                 │
│  ───────────────────────────                                                │
│  • Gap = κ_HH - κ_TH                                                       │
│  • Ceiling % = κ_TH / κ_HH                                                 │
│  • Statistical significance test                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.3 Handling Disagreement

Human disagreement is informative, not noise. We analyze it:

| Disagreement Type | Interpretation | Action |
|-------------------|----------------|--------|
| **Random noise** | Annotator error | Filter via quality control |
| **Systematic ambiguity** | Genuine linguistic ambiguity | TagTeam should flag ambiguity |
| **Guideline ambiguity** | Task definition unclear | Revise guidelines |
| **Expertise gap** | Task requires knowledge annotators lack | Use expert annotators |

**Principle 8**: Analyze disagreement patterns. If TagTeam disagrees where humans disagree, that's acceptable. If TagTeam disagrees where humans agree, that's a bug.

---

### 4. Annotation Protocols

#### 4.1 Protocol Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Clarity** | Unambiguous instructions with examples |
| **Completeness** | Cover all expected cases |
| **Consistency** | Same guidelines for all annotators |
| **Calibration** | Training phase with feedback |
| **Quality control** | Attention checks, gold questions |

#### 4.2 Standard Protocol Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ANNOTATION PROTOCOL TEMPLATE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. TASK OVERVIEW                                                           │
│     • What you will be annotating                                          │
│     • Why this annotation matters                                          │
│     • Estimated time per item                                              │
│                                                                             │
│  2. DEFINITIONS                                                             │
│     • Key terms with precise definitions                                   │
│     • Category descriptions with criteria                                  │
│                                                                             │
│  3. EXAMPLES                                                                │
│     • Clear positive examples for each category                            │
│     • Clear negative examples (what NOT to annotate)                       │
│     • Borderline cases with explanations                                   │
│                                                                             │
│  4. DECISION FLOWCHART                                                      │
│     • Step-by-step decision procedure                                      │
│     • How to handle edge cases                                             │
│     • When to mark "uncertain"                                             │
│                                                                             │
│  5. INTERFACE INSTRUCTIONS                                                  │
│     • How to use the annotation tool                                       │
│     • Keyboard shortcuts                                                   │
│     • How to correct mistakes                                              │
│                                                                             │
│  6. QUALITY EXPECTATIONS                                                    │
│     • Expected agreement levels                                            │
│     • How quality will be measured                                         │
│     • Feedback and revision process                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 4.3 Entity Annotation Protocol

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ENTITY ANNOTATION PROTOCOL                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TASK: Mark all entity mentions in the text and assign type labels.        │
│                                                                             │
│  ENTITY TYPES:                                                              │
│  ─────────────                                                              │
│  PERSON      - Individual humans (named or described)                       │
│               Examples: "John", "the CEO", "her", "the defendant"          │
│                                                                             │
│  ORGANIZATION - Companies, agencies, institutions, groups                   │
│               Examples: "Microsoft", "the committee", "Congress"           │
│                                                                             │
│  LOCATION    - Places, regions, addresses                                   │
│               Examples: "Paris", "the office", "downtown"                  │
│                                                                             │
│  ARTIFACT    - Physical or digital objects                                  │
│               Examples: "the report", "the car", "the software"            │
│                                                                             │
│  EVENT       - Named events (when used as noun)                             │
│               Examples: "the merger", "the trial", "the crash"             │
│                                                                             │
│  TEMPORAL    - Time expressions                                             │
│               Examples: "yesterday", "Q3 2024", "the deadline"             │
│                                                                             │
│  QUANTITY    - Numeric amounts with units                                   │
│               Examples: "5 million dollars", "three employees"             │
│                                                                             │
│  WHAT TO ANNOTATE:                                                          │
│  ─────────────────                                                          │
│  ✓ All noun phrases referring to entities                                  │
│  ✓ Pronouns (mark as same type as antecedent if known)                     │
│  ✓ Named entities and descriptive references                               │
│                                                                             │
│  WHAT NOT TO ANNOTATE:                                                      │
│  ─────────────────────                                                      │
│  ✗ Generic/abstract nouns ("truth", "democracy")                           │
│  ✗ Predicates ("is a doctor" - annotate "doctor" only if NP)              │
│  ✗ Embedded clauses as entities                                            │
│                                                                             │
│  SPAN GUIDELINES:                                                           │
│  ────────────────                                                           │
│  • Include full NP: "the former CEO" not just "CEO"                        │
│  • Include titles: "Dr. Smith" not "Smith"                                 │
│  • Exclude relative clauses: "the man [who called]" → "the man"           │
│                                                                             │
│  EXAMPLE:                                                                   │
│  ────────                                                                   │
│  "Microsoft announced that CEO Satya Nadella will visit Paris next week."  │
│                                                                             │
│  Annotations:                                                               │
│  [Microsoft]_ORG [CEO Satya Nadella]_PERSON [Paris]_LOCATION               │
│  [next week]_TEMPORAL                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 4.4 Factuality Annotation Protocol

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   FACTUALITY ANNOTATION PROTOCOL                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TASK: For each highlighted proposition, judge how the text presents it.   │
│                                                                             │
│  FACTUALITY LEVELS:                                                         │
│  ──────────────────                                                         │
│                                                                             │
│  ASSERTED (AS)                                                              │
│    The text presents this as definitely true.                              │
│    The author/speaker commits to its truth.                                │
│    Example: "The company announced record profits."                        │
│             → "company announced record profits" = ASSERTED                │
│                                                                             │
│  CLAIMED (CL)                                                               │
│    The text attributes this to someone else.                               │
│    The author does NOT commit to its truth.                                │
│    Example: "The CEO said profits increased."                              │
│             → "profits increased" = CLAIMED (by CEO)                       │
│                                                                             │
│  UNCERTAIN (UN)                                                             │
│    The text presents this as possible but not certain.                     │
│    Markers: "may", "might", "possibly", "perhaps"                          │
│    Example: "Profits may have increased."                                  │
│             → "profits increased" = UNCERTAIN                              │
│                                                                             │
│  NEGATED (NG)                                                               │
│    The text presents this as definitely false.                             │
│    Example: "Profits did not increase."                                    │
│             → "profits increased" = NEGATED                                │
│                                                                             │
│  HYPOTHETICAL (HY)                                                          │
│    The text presents this as contrary to fact or conditional.              │
│    Markers: "if", "would have", "had [past perfect]"                       │
│    Example: "If profits had increased, we would have expanded."            │
│             → "profits increased" = HYPOTHETICAL                           │
│                                                                             │
│  DECISION PROCEDURE:                                                        │
│  ───────────────────                                                        │
│                                                                             │
│           ┌─────────────────────────────┐                                  │
│           │ Is the proposition negated? │                                  │
│           └─────────────┬───────────────┘                                  │
│                    YES  │  NO                                               │
│                    ▼    │                                                   │
│              ┌──────┐   │                                                   │
│              │  NG  │   ▼                                                   │
│              └──────┘   ┌─────────────────────────────┐                    │
│                         │ Is it attributed to someone?│                    │
│                         └─────────────┬───────────────┘                    │
│                                  YES  │  NO                                 │
│                                  ▼    │                                     │
│                            ┌──────┐   ▼                                     │
│                            │  CL  │   ┌─────────────────────────────┐      │
│                            └──────┘   │ Is it conditional/counter-  │      │
│                                       │ factual?                    │      │
│                                       └─────────────┬───────────────┘      │
│                                                YES  │  NO                   │
│                                                ▼    │                       │
│                                          ┌──────┐   ▼                       │
│                                          │  HY  │   ┌─────────────────┐    │
│                                          └──────┘   │ Is it uncertain?│    │
│                                                     └────────┬────────┘    │
│                                                         YES  │  NO         │
│                                                         ▼    ▼             │
│                                                   ┌──────┐ ┌──────┐        │
│                                                   │  UN  │ │  AS  │        │
│                                                   └──────┘ └──────┘        │
│                                                                             │
│  COMPLEX EXAMPLE:                                                           │
│  ────────────────                                                           │
│  "The witness denied that the suspect said he was at the bank."            │
│                                                                             │
│  Propositions to judge:                                                     │
│  (a) "The witness denied X" → ASSERTED (author commits to denial)         │
│  (b) "The suspect said Y" → CLAIMED-THEN-NEGATED (via denial)             │
│  (c) "He was at the bank" → CLAIMED (by suspect, within denial scope)     │
│                                                                             │
│  Note: (c) is NOT asserted, NOT claimed as true by author.                 │
│        It is merely what the suspect allegedly claimed.                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 5. Annotator Management

#### 5.1 Annotator Tiers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ANNOTATOR TIER STRUCTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TIER 1: EXPERT LINGUISTS                                                   │
│  ─────────────────────────                                                  │
│  Qualifications:                                                            │
│    • Graduate degree in linguistics or related field                       │
│    • Experience with formal semantics or computational linguistics         │
│    • Familiarity with BFO/ontological concepts (preferred)                 │
│                                                                             │
│  Responsibilities:                                                          │
│    • Design and refine annotation guidelines                               │
│    • Adjudicate difficult cases                                            │
│    • Create gold standard data                                             │
│    • Train Tier 2 annotators                                               │
│                                                                             │
│  Scale: 2-5 experts                                                         │
│  Cost: $50-100/hour                                                        │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  TIER 2: TRAINED ANNOTATORS                                                 │
│  ───────────────────────────                                                │
│  Qualifications:                                                            │
│    • Bachelor's degree (any field)                                         │
│    • Strong reading comprehension                                          │
│    • Pass qualification test (>80% on gold examples)                       │
│    • Complete training module                                              │
│                                                                             │
│  Responsibilities:                                                          │
│    • Primary annotation workforce                                          │
│    • Flag difficult cases for Tier 1 review                                │
│                                                                             │
│  Scale: 10-30 annotators                                                    │
│  Cost: $20-40/hour                                                         │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  TIER 3: CROWD WORKERS                                                      │
│  ─────────────────────                                                      │
│  Qualifications:                                                            │
│    • Native English speaker                                                │
│    • Pass basic qualification (>70% on simple examples)                    │
│    • History of quality work on platform                                   │
│                                                                             │
│  Responsibilities:                                                          │
│    • Simple binary judgments                                               │
│    • Preference comparisons                                                │
│    • Large-scale validation                                                │
│                                                                             │
│  Scale: 100+ workers                                                        │
│  Cost: $0.10-0.50/task                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.2 Quality Control Mechanisms

| Mechanism | Description | Implementation |
|-----------|-------------|----------------|
| **Gold questions** | Known-answer items seeded into task | Reject annotators below 80% on gold |
| **Attention checks** | Obviously wrong options to detect random clicking | Flag annotators who fail |
| **Redundancy** | Multiple annotators per item | 3-5 annotators per item |
| **Agreement monitoring** | Track each annotator's agreement with others | Investigate outliers |
| **Calibration sessions** | Regular meetings to align understanding | Weekly for Tier 2 |
| **Feedback loops** | Annotators see how their work compares | Improves consistency |

#### 5.3 Training Protocol

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ANNOTATOR TRAINING PROTOCOL                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: ORIENTATION (1 hour)                                              │
│  ─────────────────────────────                                              │
│  • Project overview and goals                                              │
│  • Why accurate annotation matters                                         │
│  • Introduction to annotation interface                                    │
│                                                                             │
│  PHASE 2: GUIDELINE STUDY (2 hours)                                         │
│  ──────────────────────────────────                                         │
│  • Read complete annotation guidelines                                     │
│  • Study examples in detail                                                │
│  • Take comprehension quiz (must pass >80%)                                │
│                                                                             │
│  PHASE 3: PRACTICE ROUND (2 hours)                                          │
│  ─────────────────────────────────                                          │
│  • Annotate 50 practice items                                              │
│  • Receive detailed feedback on each item                                  │
│  • Discuss errors with trainer                                             │
│                                                                             │
│  PHASE 4: CALIBRATION ROUND (1 hour)                                        │
│  ────────────────────────────────────                                       │
│  • Annotate 30 items alongside other trainees                              │
│  • Group discussion of disagreements                                       │
│  • Guideline clarifications based on discussion                            │
│                                                                             │
│  PHASE 5: QUALIFICATION TEST (1 hour)                                       │
│  ─────────────────────────────────────                                      │
│  • Annotate 50 gold-standard items (no feedback)                           │
│  • Must achieve >80% agreement with gold                                   │
│  • Retake permitted once after additional training                         │
│                                                                             │
│  ONGOING: QUALITY MAINTENANCE                                               │
│  ─────────────────────────────                                              │
│  • Weekly calibration sessions                                             │
│  • Monthly requalification (25 gold items)                                 │
│  • Continuous agreement monitoring                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 6. Test Corpus Design

#### 6.1 Corpus Composition

| Dimension | Distribution | Rationale |
|-----------|--------------|-----------|
| **Domain** | 10+ domains, none >15% | Generality |
| **Complexity** | 33% simple, 40% medium, 27% complex | Realistic distribution |
| **Length** | 1-50 words, mean ~20 | Cover range |
| **Phenomena** | Stratified by linguistic phenomenon | Coverage |
| **Ambiguity** | 20% intentionally ambiguous | Test ambiguity handling |

#### 6.2 Sample Size Requirements

| Task | Minimum Items | Annotators per Item | Total Annotations |
|------|---------------|---------------------|-------------------|
| Entity recognition | 500 sentences | 3 | 1,500 |
| Relation extraction | 500 sentences | 3 | 1,500 |
| Factuality assessment | 300 propositions | 5 | 1,500 |
| Temporal ordering | 200 event pairs | 5 | 1,000 |
| Inference validity | 500 pairs | 3 | 1,500 |
| Interpretation preference | 200 sentences | 5 | 1,000 |

**Total estimated annotation effort**: ~8,000 annotations

#### 6.3 Corpus Sources

| Source | Domain | Complexity | Notes |
|--------|--------|------------|-------|
| **News articles** | Journalism | Medium | Event-rich, attribution-heavy |
| **Legal contracts** | Legal | High | Modal-rich, precise language |
| **Clinical notes** | Medical | Medium | Domain terminology |
| **SEC filings** | Finance | High | Regulatory language |
| **Wikipedia** | General | Low-Medium | Clean, encyclopedic |
| **Social media** | Informal | Low | Noisy, colloquial |
| **Scientific abstracts** | Technical | High | Passive voice, hedging |
| **Meeting transcripts** | Business | Medium | Spoken language |
| **Email** | Professional | Low-Medium | Varied register |
| **Fiction** | Literary | High | Figurative language |

---

### 7. Evaluation Execution

#### 7.1 Execution Phases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EVALUATION EXECUTION PHASES                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: PREPARATION (Weeks 1-2)                                           │
│  ─────────────────────────────────                                          │
│  • Finalize annotation guidelines                                          │
│  • Set up annotation platform                                              │
│  • Recruit and screen annotators                                           │
│  • Pilot test protocols with 5% of corpus                                  │
│                                                                             │
│  PHASE 2: TRAINING (Weeks 3-4)                                              │
│  ─────────────────────────────                                              │
│  • Train Tier 2 annotators                                                 │
│  • Qualify annotators                                                      │
│  • Refine guidelines based on training feedback                            │
│                                                                             │
│  PHASE 3: ANNOTATION (Weeks 5-10)                                           │
│  ─────────────────────────────────                                          │
│  • Execute primary annotation                                              │
│  • Monitor quality continuously                                            │
│  • Adjudicate disagreements                                                │
│  • Re-annotate as needed                                                   │
│                                                                             │
│  PHASE 4: TAGTEAM EVALUATION (Weeks 11-12)                                  │
│  ─────────────────────────────────────────                                  │
│  • Run TagTeam on corpus                                                   │
│  • Project TagTeam output to annotation schema                             │
│  • Calculate agreement metrics                                             │
│                                                                             │
│  PHASE 5: ANALYSIS & REPORTING (Weeks 13-14)                                │
│  ─────────────────────────────────────────────                              │
│  • Statistical analysis                                                    │
│  • Error categorization                                                    │
│  • Generate report                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 7.2 Platform Requirements

| Requirement | Specification |
|-------------|---------------|
| **Annotation interface** | Web-based, supports span selection, categorical labels |
| **Quality monitoring** | Real-time agreement tracking, gold question insertion |
| **Progress tracking** | Dashboard showing completion, quality metrics |
| **Data export** | JSON/CSV export compatible with analysis scripts |
| **Annotator management** | Assignment, qualification tracking, payment |

Recommended platforms: Prodigy, Label Studio, Amazon SageMaker Ground Truth, Prolific + custom interface

---

### 8. Reporting Framework

#### 8.1 Scorecard Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  TAGTEAM vs. HUMAN EVALUATION SCORECARD v1.0                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STRUCTURAL EXTRACTION                                                      │
│  ═════════════════════                                                      │
│                                                                             │
│  Task              Human Ceiling (κ_HH)   TagTeam (κ_TH)   % of Ceiling    │
│  ─────────────────────────────────────────────────────────────────────     │
│  Entity recognition      ____                ____            ____%         │
│  Relation extraction     ____                ____            ____%         │
│  Event detection         ____                ____            ____%         │
│                                                                             │
│  SEMANTIC JUDGMENT                                                          │
│  ═════════════════                                                          │
│                                                                             │
│  Task              Human Ceiling (κ_HH)   TagTeam (κ_TH)   % of Ceiling    │
│  ─────────────────────────────────────────────────────────────────────     │
│  Factuality              ____                ____            ____%         │
│  Temporal ordering       ____                ____            ____%         │
│  Inference validity      ____                ____            ____%         │
│                                                                             │
│  META-EVALUATION                                                            │
│  ═══════════════                                                            │
│                                                                             │
│  Interpretation preference:                                                 │
│    TagTeam preferred:    ____%                                             │
│    Baseline preferred:   ____%                                             │
│    Tie:                  ____%                                             │
│                                                                             │
│  OVERALL ASSESSMENT                                                         │
│  ══════════════════                                                         │
│                                                                             │
│  Mean % of ceiling (structural):    ____%                                  │
│  Mean % of ceiling (semantic):      ____%                                  │
│  Preference win rate:               ____%                                  │
│                                                                             │
│  INTERPRETATION:                                                            │
│  ───────────────                                                            │
│  □ Human-level (>95% of ceiling on all tasks)                              │
│  □ Near-human (90-95% of ceiling)                                          │
│  □ Below human (80-90% of ceiling)                                         │
│  □ Significant gap (<80% of ceiling)                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 8.2 Narrative Requirements

1. **Executive Summary**: Key findings in one paragraph
2. **Methodology**: Corpus, annotators, protocols, quality control
3. **Human-Human Agreement**: Ceiling by task, disagreement analysis
4. **TagTeam-Human Agreement**: By task, comparison to ceiling
5. **Error Analysis**: Categorized TagTeam errors with examples
6. **Disagreement Analysis**: Where TagTeam ≠ humans, who is "right"?
7. **Statistical Significance**: Confidence intervals, significance tests
8. **Limitations**: What the evaluation does and does not show
9. **Recommendations**: Priorities for TagTeam improvement

---

### 9. Success Criteria

The evaluation succeeds if it provides **credible evidence** for TagTeam's positioning:

| Criterion | Threshold | Interpretation |
|-----------|-----------|----------------|
| **Entity recognition** | ≥90% of ceiling | Core capability validated |
| **Relation extraction** | ≥85% of ceiling | Core capability validated |
| **Factuality assessment** | ≥90% of ceiling | Key differentiator validated |
| **Temporal ordering** | ≥85% of ceiling | Core capability validated |
| **Inference validity** | ≥80% of ceiling | Acceptable for v1 |
| **Interpretation preference** | ≥50% win rate vs. baseline | Competitive quality |

**Principle 9**: Meeting these thresholds means TagTeam performs at or near human level. Failing them identifies improvement priorities.

---

### 10. Ethical Considerations

#### 10.1 Annotator Welfare

| Concern | Mitigation |
|---------|------------|
| **Fair compensation** | Pay at least local minimum wage; Tier 2 at professional rates |
| **Work conditions** | Reasonable task length; breaks required; no overnight deadlines |
| **Feedback dignity** | Constructive feedback; no public shaming of errors |
| **Data attribution** | Acknowledge annotators in publications (if desired) |

#### 10.2 Data Privacy

| Concern | Mitigation |
|---------|------------|
| **PII in corpus** | Remove or anonymize personal information |
| **Annotator identity** | Anonymize in published data |
| **Sensitive content** | Content warnings; opt-out for sensitive tasks |

**Principle 10**: Treat annotators as collaborators, not as computation.

---

### 11. Summary of Principles

| # | Principle |
|---|-----------|
| 1 | Compare to human task performance, not abstract understanding |
| 2 | Human-human agreement is the ceiling |
| 3 | Report as percentage of human ceiling |
| 4 | Select tasks that map to TagTeam's capabilities |
| 5 | Invest heavily in annotation quality |
| 6 | Match annotator expertise to task complexity |
| 7 | Design elicitation instruments to minimize bias |
| 8 | Analyze disagreement patterns as signal |
| 9 | Meeting thresholds validates capability; failing identifies priorities |
| 10 | Treat annotators as collaborators |

---

### 12. Appendix: Recommended Existing Datasets

Where possible, leverage existing annotated datasets to reduce cost and increase comparability:

| Dataset | Task | Size | Notes |
|---------|------|------|-------|
| **OntoNotes** | Entity, coreference | 1.6M words | Standard benchmark |
| **ACE 2005** | Entity, relation, event | 600 documents | Multi-task |
| **FactBank** | Factuality | 9,000 events | Key for factuality testing |
| **TimeBank** | Temporal ordering | 6,000 temporal links | Key for temporal testing |
| **SNLI/MultiNLI** | Inference | 570K/433K pairs | Standard entailment |
| **TACRED** | Relation extraction | 106K instances | Large relation dataset |
| **MAVEN** | Event detection | 4,400 documents | Comprehensive events |

**Principle**: Use existing datasets where they match evaluation needs. Create custom annotations only where existing data is insufficient.

