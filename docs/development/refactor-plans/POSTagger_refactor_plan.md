# POSTagger Refactor Plan

**Goal**: Transform the legacy `POSTagger.js` into a modern, functional, and performant module that serves as the foundation for the TagTeam Semantic Engine.

**Guiding Principles**:
1.  **Functional Core**: Pure functions, no shared mutable state, no classes.
2.  **Modern JavaScript**: ES6+ standards, modules, no polyfills.
3.  **Determinism**: Same input + Same Lexicon = Same Output.
4.  **Performance**: Minimize allocation in hot loops.
5.  **Testability**: Comprehensive unit tests for pure functions and regression tests for the pipeline.
6.  **Observability**: Design for debugging with execution tracing.

---

## Phase 1: Code Hygiene, Modernization & Safety Net
*Objective: Clean up technical debt and establish a testing baseline.*

1.  **Golden Master Testing**:
    *   Create a test script that runs the *current* `POSTagger` against a corpus of ~50 sentences (covering edge cases).
    *   Save the output as `baseline_output.json`.
    *   Use this to verify that subsequent refactors do not alter the tagging logic unintentionally.
2.  **Remove Polyfills**: Delete `String.prototype.startsWith` and `endsWith`. Use native methods.
3.  **Variable Scoping**: Replace all `var` with `const` (default) and `let` (mutation).
4.  **Fix Logic Errors**: Correct the typo on line 94 (`ret[i] = i, "JJ";` -> `ret[i] = "JJ";`).
5.  **Strict Mode**: Ensure strict mode compliance.

## Phase 2: Functional Architecture
*Objective: Move from OOP to Functional Programming.*

1.  **Remove Class Structure**:
    *   Eliminate `function POSTagger() { ... }` and `POSTagger.prototype`.
    *   Eliminate `this` context usage.
2.  **Dependency Injection**:
    *   The tagging function should accept the lexicon as an argument, not rely on a global `window.POSTAGGER_LEXICON`.
    *   Signature: `tag(words: string[], lexicon: object, tagMap: object) -> [string, string][]`.
3.  **Pure Functions**:
    *   Extract `wordInLexicon(word, lexicon)` as a pure helper.
    *   Extract transformation rules into a composed function or a pipeline if performance allows.
    *   **Unit Tests**: Create granular unit tests for `wordInLexicon` and individual transformation rules (e.g., "Rule 5: 'national' -> JJ").

## Phase 3: Module System, Debugging & PWA Readiness
*Objective: Make the code importable, inspectable, and bundler-friendly.*

1.  **ES Modules**:
    *   Convert to `export const tag = ...`.
    *   Allow the lexicon to be loaded asynchronously (crucial for PWA startup time).
2.  **Design for Debugging (Tracing)**:
    *   Implement a `trace` option in the `tag` function: `tag(words, lexicon, { debug: true })`.
    *   Return an execution log showing which rules triggered for which words (e.g., "Word 'running': NN -> VBG via Rule 8").
    *   Allow injecting a logger callback to inspect intermediate states between tokenization, initial tagging, and transformation.
3.  **Type Safety (JSDoc)**:
    *   Add JSDoc types for `Lexicon`, `TagMap`, and `TaggedToken` to aid tooling.

## Phase 4: Performance Optimization
*Objective: Ensure <50ms latency for IEE scenarios.*

1.  **Lexicon Lookup Optimization**:
    *   Ensure the lexicon object is optimized for V8 hidden classes (if applicable) or use a `Map` if keys are dynamic (though object lookup is usually faster for static dictionaries).
2.  **Array Allocation**:
    *   Review the `ret` array allocation.
    *   Avoid creating intermediate arrays during transformation rules if possible.

## Phase 5: Fandaws/IEE Alignment (Future Proofing)
*Objective: Prepare data structures for the Semantic Graph.*

1.  **Rich Token Objects**:
    *   Instead of returning `[word, tag]`, prepare to return `{ text, tag, index }` objects to support the `SemanticNode` requirements later.
2.  **Tokenizer Separation**:
    *   The current tagger assumes pre-tokenized input. Explicitly define the `Tokenizer` -> `Tagger` pipeline.

---

## Proposed File Structure

```text
/src
  /core
    tagger.js       # Pure functional tagger logic
    tokenizer.js    # Regex-based tokenizer
  /data
    lexicon.js      # The data (lazy loaded)
  index.js          # Main entry point
```