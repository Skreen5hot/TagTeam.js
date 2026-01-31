# Agentic Development Startup Guide

**How to set up a high-quality, AI-assisted software project from day one.**

This guide distills the development philosophy, practices, and hard-won lessons from the TagTeam.js project — a semantic parsing engine built almost entirely through human-AI pair programming with Claude. It is written for a new team starting a new project who wants to replicate what worked.

---

## Table of Contents

1. [Philosophy](#1-philosophy)
2. [Repository Structure](#2-repository-structure)
3. [The CLAUDE.md / Agent Instructions File](#3-the-claudemd--agent-instructions-file)
4. [Specification-Driven Development](#4-specification-driven-development)
5. [Test-Driven Development](#5-test-driven-development)
6. [The Planning-First Workflow](#6-the-planning-first-workflow)
7. [Scope Control: The v1/v2 Contract](#7-scope-control-the-v1v2-contract)
8. [Phased Delivery](#8-phased-delivery)
9. [Documentation as Architecture](#9-documentation-as-architecture)
10. [Security from Day One](#10-security-from-day-one)
11. [CI/CD and Automation](#11-cicd-and-automation)
12. [Dependency Philosophy](#12-dependency-philosophy)
13. [Working with the AI Agent](#13-working-with-the-ai-agent)
14. [Metrics and Quality Gates](#14-metrics-and-quality-gates)
15. [Anti-Patterns to Avoid](#15-anti-patterns-to-avoid)
16. [Starter Checklist](#16-starter-checklist)

---

## 1. Philosophy

These are the core beliefs that drove TagTeam's success. Adopt them before writing a single line of code.

### 1.1 Determinism Over Cleverness

> "Better to output structured uncertainty than false precision."

Your system should produce the same output for the same input, every time. When you don't know something, say so explicitly in your data structures — don't guess. This principle makes your system auditable, testable, and trustworthy.

### 1.2 Correctness Before Coverage

> "TagTeam.js is an intake compiler, not an AI. Success is measured by correctness and predictability, not coverage."

It is better to handle 20 cases perfectly than 100 cases poorly. Resist the urge to add features before the core is rock-solid. An AI agent will happily generate code for edge cases all day — your job is to stop it and ask "is the foundation right first?"

### 1.3 Semantic Honesty

Don't force your system to produce answers it can't justify. If a piece of data is ambiguous, preserve the ambiguity and let the consumer decide. TagTeam went through six phases of ambiguity handling — detection, resolution strategy, interpretation lattice — precisely because forcing false certainty is worse than admitting uncertainty.

### 1.4 Minimalism

Every dependency is a liability. Every abstraction is a maintenance cost. Every feature that isn't needed today is a distraction. The right amount of complexity is the minimum needed for the current task.

---

## 2. Repository Structure

Set up your repository with clear separation of concerns from the start. Here is the structure that worked:

```
project/
├── src/                    # Source code, organized by subsystem
│   ├── core/               # Core functionality
│   ├── analyzers/          # Analysis modules
│   ├── graph/              # Output generation
│   ├── security/           # Security controls
│   └── data/               # Static data/registries
│
├── tests/                  # All tests
│   ├── unit/               # Unit tests per component
│   ├── integration/        # End-to-end system tests
│   ├── browser/            # Browser-specific tests (if applicable)
│   └── README.md           # Test documentation
│
├── docs/                   # User and developer documentation
│   ├── architecture/       # Design decisions and rationale
│   ├── development/        # Development guides (bundle strategy, etc.)
│   ├── guides/             # User-facing guides
│   └── research/           # Research notes and references
│
├── planning/               # Sprint/phase planning documents
│   ├── phase1/
│   ├── phase2/
│   └── ...
│
├── deliverables/           # Milestone summaries and reports
│
├── scripts/                # Build, test, and utility scripts
│
├── config/                 # Domain/environment configuration
│
├── dist/                   # Built artifacts (gitignored or committed)
│
├── .claude/                # AI agent settings and permissions
│   └── settings.json
│
├── .github/
│   ├── workflows/          # CI/CD pipelines
│   └── dependabot.yml      # Dependency update automation
│
├── ROADMAP.md              # Living roadmap (the most important doc)
├── README.md               # Quick start and overview
└── package.json            # Project metadata
```

### Key Principles

- **`planning/` is separate from `docs/`**: Planning documents are working documents for the development process. Docs are for users and future developers. Don't mix them.
- **`deliverables/` captures milestones**: After each phase, write a summary of what was accomplished. This is your historical record.
- **`.claude/settings.json` controls agent permissions**: Whitelist exactly which commands the AI agent can run. Start restrictive, loosen as trust builds.
- **`ROADMAP.md` is the single source of truth**: This is the document the AI agent and the human both refer to constantly. It contains the vision, the phase plan, the scope contract, and the current status.

---

## 3. The CLAUDE.md / Agent Instructions File

If your AI tool supports a project-level instructions file (Claude Code uses `.claude/settings.json` and CLAUDE.md), invest time in it. This is the "brain" that tells the AI agent what it can and cannot do.

### Permission Whitelisting

Start restrictive. Only allow what's needed:

```json
{
  "permissions": {
    "allow": [
      "Bash(node scripts/build.js:*)",
      "Bash(node tests/*:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git fetch:*)"
    ]
  }
}
```

### What to Include in Agent Instructions

If you have a CLAUDE.md or equivalent project-level instructions file, include:

1. **Project identity**: What the project is, what it is NOT
2. **Architecture overview**: The key patterns the agent must follow
3. **Naming conventions**: How files, classes, and variables are named
4. **Test requirements**: "Every new module must have a corresponding test file"
5. **Scope boundaries**: What is v1, what is deferred
6. **Build/test commands**: Exact commands to run
7. **Don't-do list**: Common mistakes to avoid ("don't add dev dependencies", "don't use external NLP libraries")

The more context you give the agent upfront, the less you need to correct it mid-task.

---

## 4. Specification-Driven Development

This is the single most important practice for agentic development.

### Write the Spec Before the Code

For every significant feature, write a specification document BEFORE asking the AI to implement it. The spec should include:

1. **Problem statement**: What problem does this solve?
2. **API design**: What will the public interface look like? (code examples)
3. **Internal architecture**: How will it work internally? (diagrams welcome)
4. **Test strategy**: What tests will prove it works? (specific test cases)
5. **Success criteria**: How do we know when it's done?
6. **Scope boundaries**: What is explicitly NOT included?
7. **Bundle/performance budget**: Size and speed constraints

TagTeam's ROADMAP.md contains detailed specifications for every phase, including:
- Expected test counts
- Bundle size budgets (+100KB max for this phase)
- API code examples showing exact usage
- Tables of expected inputs and outputs
- Architecture diagrams showing data flow

### Why This Matters for Agentic Development

An AI agent without a spec will:
- Over-engineer solutions
- Add features you didn't ask for
- Make architectural decisions that conflict with your vision
- Write code that technically works but doesn't fit the system

An AI agent WITH a spec will:
- Implement exactly what's described
- Follow the architectural patterns you've defined
- Write tests that match your test strategy
- Stay within scope

### Spec Template

```markdown
## Phase X.Y: Feature Name

**Goal:** One sentence describing the objective
**Status:** Not started / In progress / Complete
**Priority:** Critical / High / Medium / Low
**Effort:** Low / Medium / High
**Tests:** Expected test count
**Bundle Size Budget:** +NKB max
**Depends On:** Phase X.Z

### Problem Statement
What problem does this solve? Why now?

### API Design
```javascript
// Show exact usage examples
const result = myModule.doThing(input, options);
```

### Internal Architecture
```
Diagram showing data flow and component interaction
```

### Deliverables
| File | Description |
|------|-------------|
| `src/module/MyModule.js` | Main implementation |
| `tests/unit/my-module.test.js` | Test suite |

### Test Coverage: N tests across M categories
| Category | Count | Description |
|----------|-------|-------------|
| Basic | 10 | Core functionality |
| Edge cases | 5 | Error handling |

### Success Criteria
- Criterion 1
- Criterion 2
- Zero regression on existing tests
```

---

## 5. Test-Driven Development

### The Test Pyramid

```
                 /\
                /  \
               /E2E \              Browser/acceptance tests
              /______\            (manual or automated)
             /        \
            /  Unit   \           Per-component isolation tests
           /  Tests    \         (the bulk of your tests)
          /__________\
         /            \
        / Integration \          Full-system corpus validation
       /   Tests       \        (golden test data)
      /_________________\
```

### Golden Test Corpus

The single best testing investment we made was creating a **golden test corpus** — a set of real-world input/output pairs that define correct behavior. For TagTeam, this was 20 ethical dilemma scenarios provided by our collaboration partner (IEE).

For your project:
1. **Collect real examples** of the inputs your system will process
2. **Define expected outputs** for each example (even approximately)
3. **Run the corpus as your primary test** (`npm test` should run this)
4. **Track accuracy metrics**: coverage, precision, F1 scores
5. **Save metrics to a file** for historical tracking (e.g., `METRICS.json`)

### Test File Conventions

```
tests/
├── unit/
│   ├── phase5/
│   │   ├── lemmatizer.test.js          # 100 tests
│   │   ├── contraction-expander.test.js # 49 tests
│   │   └── ambiguity-detector.test.js   # 31 tests
│   ├── phase6/
│   │   ├── selectional-preferences.test.js # 60 tests
│   │   └── interpretation-lattice.test.js  # 55 tests
│   └── security/
│       ├── input-validation.test.js
│       └── output-sanitization.test.js
├── integration/
│   └── test-full-corpus.js              # 20-scenario validation
└── README.md                            # Explains test structure
```

### Test-First Workflow with an AI Agent

1. **You write the test spec** (what should be tested, expected results)
2. **Agent writes the test file** (from your spec)
3. **Agent runs the tests** (all should fail — nothing implemented yet)
4. **Agent implements the feature** (making tests pass one by one)
5. **Agent runs the full test suite** (no regressions)
6. **You review** the implementation against the spec

This workflow constrains the agent to produce exactly what the tests require — no more, no less.

### Performance Budgets as Tests

Set explicit performance targets and test them:

```javascript
const start = Date.now();
const result = parser.parse(text);
const elapsed = Date.now() - start;
assert(elapsed < 50, `Parse took ${elapsed}ms, expected <50ms`);
```

TagTeam targets: <50ms per parse, <500ms for ontology loading, <10ms for cached loads.

---

## 6. The Planning-First Workflow

Every sprint/phase follows this cycle:

```
Plan → Spec → Test Design → Implement → Validate → Document → Deliver
```

### Planning Documents

Before each phase, create a planning document:

```
planning/
├── phase1/
│   ├── INVENTORY.md          # What exists, what's needed
│   └── INTERFACES.md         # API design
├── phase2/
│   └── IMPLEMENTATION_PLAN.md
└── phase6/
    └── PHASE_6.4_IMPLEMENTATION_PLAN.md
```

These documents serve three purposes:
1. **Alignment**: Human and AI agent agree on what to build
2. **Constraint**: The agent has boundaries to work within
3. **History**: Future developers (and future AI sessions) can understand why decisions were made

### Weekly Sprint Structure

TagTeam used a weekly sprint cadence:

| Day | Activity |
|-----|----------|
| Start | Review ROADMAP, write/update planning doc for the phase |
| Early | Design tests, write test specs |
| Middle | Implement features (agent does the coding) |
| Late | Run full test suite, fix regressions |
| End | Write deliverable summary, update ROADMAP |

---

## 7. Scope Control: The v1/v2 Contract

This is one of the most important practices for working with an AI agent. **Lock your scope.**

### The Problem

AI agents are enthusiastic. They will happily implement features you mentioned in passing, refactor code that's working fine, and add abstractions "for future flexibility." Without scope control, you end up with a sprawling codebase that does many things poorly.

### The Solution: Explicit Scope Contract

Create a section in your ROADMAP that explicitly classifies every feature as v1 or v2:

```markdown
## v1/v2 Scope Contract

### v1: [Mission Statement]
**Architectural constraints:** [What v1 does NOT do]

**v1 IN SCOPE (locked):**
- Feature A (bounded: only handles X, Y, Z)
- Feature B
- All existing passing capabilities frozen

**v1 EXPLICITLY DEFERRED to v2:**
- Feature C (requires architectural change X)
- Feature D (needs discourse memory)
- Feature E (needs clause segmentation)
```

### Key Principles

1. **"Locked" means locked.** Once the scope contract is written, don't add to v1. New ideas go to v2.
2. **Bound every feature.** Don't just say "add modal detection." Say "add modal detection for shall, must, should — no conditional/subjunctive mood."
3. **Explain WHY things are deferred.** "Deferred to v2 because it requires clause segmentation, which is an architectural change." This prevents the agent from trying to sneak it in.
4. **Use scope tags in your backlog.** Tag every enhancement as `[v1]` or `[v2]` so there's no ambiguity.

### Enhancement Tracking

Maintain a backlog file (e.g., `enhancements_from_tests.md`) with:
- Enhancement ID (ENH-001, ENH-002, ...)
- Source (which test revealed the need)
- Scope tag (`[v1]` or `[v2]`)
- Priority and complexity
- Proposed fix (specific enough for the agent to implement)

---

## 8. Phased Delivery

Break your project into numbered phases with clear deliverables and dependencies.

### Phase Structure

```markdown
### Phase 6.2: InterpretationLattice

**Status:** Complete
**Tests:** 55 passing
**Depends On:** Phase 6.1 (AmbiguityResolver)
**Enables:** Phase 6.3 (AlternativeGraphBuilder)

**Deliverables:**
- `src/graph/InterpretationLattice.js`
- `tests/unit/phase6/interpretation-lattice.test.js`
```

### Dependency Chain

Map your phases as a dependency graph:

```
Phase 5.0 → 5.1 → 5.2 → 5.3
                              ↘
                    Phase 6.0 → 6.1 → 6.2 → 6.3 → 6.4
                                                       ↘
                                             Phase 6.5.1 → 6.5.2 → 6.5.3
```

This prevents the agent from trying to implement Phase 6.3 before 6.2 is done.

### Backwards Compatibility via Opt-In Flags

When adding new capabilities, use opt-in flags to preserve backwards compatibility:

```javascript
// Old API (still works)
const graph = builder.build(text);

// New API (opt-in)
const result = builder.build(text, { preserveAmbiguity: true });
```

TagTeam used this pattern for:
- `detectAmbiguity: true` (Phase 5)
- `preserveAmbiguity: true` (Phase 6)
- `deonticVocabulary: 'extended'` (Phase 6.4)

---

## 9. Documentation as Architecture

Documentation isn't an afterthought — it's a design tool.

### Documentation Hierarchy

| Document | Audience | Purpose |
|----------|----------|---------|
| `README.md` | New users | Quick start, features, installation |
| `ROADMAP.md` | Developers + AI agent | Vision, architecture, phase plan, scope |
| `docs/architecture/` | Senior developers | Design decisions and rationale |
| `docs/guides/` | Users | How-to guides for specific features |
| `planning/` | Development team | Sprint-level implementation plans |
| `deliverables/` | Stakeholders | What was accomplished each phase |
| `enhancements_from_tests.md` | Development team | Known gaps and future work |

### The ROADMAP.md

This is the most important file in the repository. It should contain:

1. **Vision statement** — What the project IS and IS NOT
2. **Architecture philosophy** — Key design decisions
3. **Completed phases** — What's been built, with test counts
4. **Current phase** — Detailed spec of what's being built now
5. **Future phases** — Specs for upcoming work
6. **v1/v2 scope contract** — What's in and out
7. **Bundle/performance budgets** — Size and speed constraints
8. **Version history** — When each phase was completed
9. **Quick reference** — Build commands, API examples

Keep this file updated after every phase. It is the primary context document for new AI sessions.

### Lessons Learned Sections

After each phase, add a "Lessons Learned" section:

```markdown
### Phase 5 Lessons Learned

**What Worked Well:**
- Incremental development with continuous testing
- Custom code + archived implementations = zero dependencies
- Opt-in flags preserve backwards compatibility

**What Could Be Improved:**
- Entity label handling inconsistency caused integration bug
- Need consistent interface between test data and production format

**Key Insight for Phase 6:**
Ambiguity detection is solid, but resolution is the hard problem.
```

---

## 10. Security from Day One

Don't bolt on security later. Build it in from the start.

### Security Module Structure

```
src/security/
├── input-validator.js       # Input size limits, pattern checks
├── semantic-validators.js   # Domain-specific attack detection
├── output-sanitizer.js      # XSS/injection prevention
├── audit-logger.js          # Security event logging
└── ontology-integrity.js    # File integrity verification (SHA-256)
```

### Trust Boundaries

Define and document your trust boundaries:

| Input Source | Trust Level | Validation |
|-------------|-------------|------------|
| User-provided text | Untrusted | Size limits, pattern checks, sanitization |
| Configuration files | Conditionally trusted | Schema validation, integrity checks |
| Your own code | Trusted | Code review, CI/CD |

### Security Testing

Maintain a dedicated security test suite:

```bash
npm run security:test  # Runs all security tests
```

Include:
- Input validation tests (malformed input, oversized input, injection attempts)
- Output sanitization tests (XSS payloads in demo pages)
- Red team corpus (adversarial inputs designed to break the system)
- Integrity verification tests (tampered files detected)

### CI/CD Security Pipeline

```yaml
# .github/workflows/security.yml
name: Security
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'  # Weekly scan
permissions:
  contents: read  # Minimal permissions
jobs:
  security:
    steps:
      - run: npm audit --audit-level=high
  security-tests:
    steps:
      - run: npm run security:test
```

---

## 11. CI/CD and Automation

### GitHub Actions Setup

At minimum, set up two workflows:

**1. Deploy/Build Pipeline** (`deploy.yml`):
- Triggers on push to main
- Runs `npm install` and `npm run build`
- Runs `npm test`
- Deploys artifacts (GitHub Pages, etc.)

**2. Security Pipeline** (`security.yml`):
- Triggers on push, pull request, and weekly schedule
- Runs `npm audit`
- Runs security-specific tests
- Verifies file integrity

### Dependabot

Enable automated dependency updates:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    labels:
      - dependencies
  - package-ecosystem: github-actions
    directory: "/"
    schedule:
      interval: weekly
```

### Minimal Permissions

Always use `permissions: contents: read` in your workflows. Only escalate when needed.

---

## 12. Dependency Philosophy

### The Two-Dependency Rule

TagTeam runs in production with exactly **two** runtime dependencies (compromise.js for NLP, n3 for ontology parsing) and **zero** dev dependencies. This is not an accident.

### Decision Framework

Before adding a dependency, ask:

1. **Can we write it ourselves in <200 lines?** If yes, write it yourself.
2. **Is this a core competency of the project?** If yes, own it — don't outsource.
3. **What's the bundle size impact?** Set a budget (+100KB max) and enforce it.
4. **What's the supply chain risk?** Every dependency is a potential CVE.
5. **Will this work in all target environments?** (Browser + Node.js for TagTeam)

### Custom Over External

TagTeam chose to build custom NLP modules (Lemmatizer, ContractionExpander, VerbPhraseExtractor, NounPhraseExtractor) rather than add an external NLP library. The result:
- Zero new dependencies
- Full control over behavior
- Smaller bundle size than any external alternative
- 100% accuracy on test corpus

The AI agent can write high-quality implementations of focused modules faster than you can evaluate and integrate a third-party library.

---

## 13. Working with the AI Agent

### Session Management

Each AI session starts fresh (or with limited context). To make sessions productive:

1. **Point the agent to ROADMAP.md first.** This gives it the full project context.
2. **Reference the specific phase spec.** "Implement Phase 6.2 as described in ROADMAP.md."
3. **Give it the test file first.** "Here are the tests. Make them pass."
4. **Set explicit scope.** "Only modify files in src/graph/. Don't touch src/core/."

### Effective Prompting Patterns

**Good:**
- "Implement Phase 6.2 InterpretationLattice as specified in ROADMAP.md. Create the file at src/graph/InterpretationLattice.js and tests at tests/unit/phase6/interpretation-lattice.test.js. The class should have these methods: getDefaultReading(), getAlternatives(), toJSONLD(). Run the tests when done."

**Bad:**
- "Add an interpretation lattice to the project." (too vague — agent will invent its own design)

### The Human's Role

When working with an AI agent, the human's job shifts from writing code to:

1. **Architecting** — Design the system, write specs, define interfaces
2. **Reviewing** — Check the agent's output against the spec
3. **Scoping** — Decide what's in v1 vs v2, what to build now vs later
4. **Testing judgment** — Decide if the tests are meaningful, not just passing
5. **Course-correcting** — When the agent drifts, pull it back to the spec

### What the AI Agent Does Well

- Implementing well-specified modules from a clear spec
- Writing large test suites with many cases
- Refactoring code to match a pattern you've defined
- Finding and fixing bugs when given a failing test
- Generating documentation from existing code
- Building CI/CD pipelines from a description

### What Requires Human Judgment

- Architectural decisions (what modules exist, how they interact)
- Scope control (what to build now vs later)
- Quality assessment (are these tests actually testing the right thing?)
- Dependency decisions (add a library vs build it yourself)
- Security threat modeling (what are the attack vectors?)

---

## 14. Metrics and Quality Gates

### Track These Metrics

| Metric | How to Measure | Target |
|--------|---------------|--------|
| Test count | Count of test cases | Growing every phase |
| Test pass rate | Passing / Total | 100% (no broken tests committed) |
| Accuracy | Correct outputs / Total corpus items | Domain-specific target |
| Precision | True positives / (True + False positives) | >90% |
| Bundle size | File size of built artifact | Under budget ceiling |
| Parse/response time | Milliseconds per operation | <50ms (or your target) |
| Dependency count | `npm ls --depth=0` | As few as possible |
| CVE count | `npm audit` | 0 high/critical |

### Save Metrics to a File

After each test run, save results:

```javascript
const metrics = {
  date: new Date().toISOString(),
  phase: '6.4',
  testCount: 72,
  passRate: 1.0,
  accuracy: 0.842,
  bundleSize: '4.85MB',
  parseTime: '38ms'
};
fs.writeFileSync('METRICS.json', JSON.stringify(metrics, null, 2));
```

This creates a historical record you can graph and trend.

### Quality Gates

Before merging any phase:

- [ ] All tests passing (`npm test`)
- [ ] Security tests passing (`npm run security:test`)
- [ ] Bundle builds successfully (`npm run build`)
- [ ] Bundle size within budget
- [ ] Performance within target
- [ ] No regressions in existing functionality
- [ ] ROADMAP.md updated with completion status
- [ ] Deliverable summary written

---

## 15. Anti-Patterns to Avoid

### 1. "Just Build It" Without a Spec

Starting implementation before writing a specification leads to:
- Code that doesn't fit the architecture
- Tests that test implementation details instead of behavior
- Scope creep (the agent adds features you didn't want)
- Rework when the design doesn't match the vision

### 2. Trusting the Agent Without Reviewing

AI agents write confident, well-structured code that is sometimes subtly wrong. Always:
- Read the code the agent produced
- Verify it matches the spec
- Run the tests yourself
- Check for security implications

### 3. Skipping the v1/v2 Classification

Every enhancement request should be immediately classified as v1 or v2. If you don't do this, you'll end up with a feature list that grows faster than you can implement it, and the agent will try to address everything at once.

### 4. Giant Monolithic Phases

Phases should be small enough to complete in 1-3 sessions. TagTeam's Phase 6 was broken into 6.0, 6.1, 6.2, 6.3, 6.4, 6.4.5, 6.5.1, 6.5.2, 6.5.3, 6.5.4, and 6.6 — each with its own tests and deliverables. Small phases mean frequent wins and easier debugging.

### 5. No Performance Budget

If you don't set bundle size and performance budgets, the codebase will bloat. TagTeam tracked bundle size at every phase with explicit budgets: "+100KB max for Phase 6", "+50KB max for Phase 7."

### 6. Ignoring Test Failures

A failing test is a spec violation. Fix it immediately or update the spec. Never leave failing tests in the codebase — they erode trust in the entire test suite.

### 7. Documentation Drift

If ROADMAP.md says one thing and the code does another, the next AI session will be confused and produce inconsistent work. Update docs as part of every phase completion.

---

## 16. Starter Checklist

Use this checklist when starting a new project:

### Day 1: Foundation
- [ ] Create repository with the directory structure from Section 2
- [ ] Write `README.md` with project identity and quick start
- [ ] Write `ROADMAP.md` with vision statement and Phase 1 spec
- [ ] Set up `.claude/settings.json` with restrictive permissions
- [ ] Initialize `package.json`
- [ ] Create `.github/workflows/` with build and security pipelines
- [ ] Enable Dependabot

### Day 2: Test Infrastructure
- [ ] Create `tests/` directory with unit/, integration/, and README.md
- [ ] Collect or create golden test corpus (real-world input/output pairs)
- [ ] Write first integration test (runs corpus, reports accuracy)
- [ ] Set up `npm test` to run the corpus test
- [ ] Set up `npm run security:test`
- [ ] Establish performance budget and targets

### Day 3: Phase 1
- [ ] Write Phase 1 specification in ROADMAP.md (follow the template in Section 4)
- [ ] Write test files for Phase 1 (tests should fail — nothing implemented yet)
- [ ] Implement Phase 1 (agent writes code to make tests pass)
- [ ] Run full test suite, verify no regressions
- [ ] Update ROADMAP.md with completion status and lessons learned
- [ ] Write deliverable summary in `deliverables/phase1/`

### Ongoing
- [ ] Classify every new idea as v1 or v2 immediately
- [ ] Write spec before implementation for every phase
- [ ] Track metrics after every test run
- [ ] Update ROADMAP.md after every phase completion
- [ ] Review agent output against the spec, not just "does it run"

---

## Summary

The TagTeam development process can be summarized in one sentence:

**Write the spec, write the tests, let the agent implement, then verify against the spec.**

Everything else — the phased delivery, the scope contract, the planning documents, the metrics tracking — exists to support that core loop. The human provides judgment, architecture, and quality control. The AI agent provides implementation speed and thoroughness. Together, they move faster and more reliably than either could alone.

---

*This guide is based on the development of TagTeam.js (2025-2026), a semantic parsing engine built through human-AI collaboration. The practices described here produced 1000+ tests, 56 source files across 9 subsystems, and a production-ready system with an A+ quality grade — all within weeks rather than months.*
