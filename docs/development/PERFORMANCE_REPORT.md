# Performance Report — Phase 4

**Date:** 2026-02-17
**Pipeline:** Tree extractors (PerceptronTagger + DependencyParser + TreeEntityExtractor + TreeActExtractor + TreeRoleMapper)
**Platform:** Node.js v20, Windows 10, Intel desktop

---

## Benchmark Configuration

- **Warm-up:** 10 iterations (discarded)
- **Measured:** 100 iterations across 50 sentences
- **Sentence types:** SVO, passive, copular, coordination, PP attachment, ditransitive
- **Method:** `performance.now()` per `buildTreeGraph()` call, sorted for percentile extraction

## Latency Results

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| p50 | < 10 ms | 15.95 ms | **Not met** |
| p75 | — | 19.05 ms | — |
| p90 | — | 23.00 ms | — |
| p95 | < 30 ms | 27.44 ms | **Met** |
| p99 | — | 30.14 ms | — |
| min | — | 10.01 ms | — |
| max | — | 30.14 ms | — |
| mean | — | 16.77 ms | — |

### p50 Target Analysis

The p50 target of 10 ms (per roadmap amendment for tree pipeline) is not met at 15.95 ms. Contributing factors:

1. **JSON model loading overhead:** Models are loaded from JSON (~2.5 MB POS + ~3.3 MB DEP), parsed per-builder instance. Binary loading (AC-4.13) reduces file size but parse cost remains.
2. **Dependency parser arc-eager transitions:** Each sentence requires O(n) transitions with feature extraction per step, each involving string concatenation for feature keys.
3. **Feature hashing not yet implemented:** Phase 2 parser uses string-keyed weight lookup. Feature hashing (Phase 5 candidate) would reduce lookup overhead.

**Improvement paths:**
- Model caching across builder instances (singleton pattern) — estimated -3 ms
- Feature hashing for parser weights — estimated -2 ms
- WebAssembly-compiled perceptron scoring — estimated -5 ms (requires Phase 5+)

## Memory Results

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Heap growth | < 50 MB | -6.84 MB | **Met** |
| Heap before | — | 59.68 MB | — |
| Heap after | — | 52.84 MB | — |

Negative heap growth indicates effective garbage collection of intermediate parse structures. No memory leaks detected over 100 iterations.

## Binary Model Size

| Model | JSON | Binary | Ratio |
|-------|------|--------|-------|
| POS tagger | 2.57 MB | 1.79 MB | 70% |
| DEP parser | 3.28 MB | 1.58 MB | 48% |
| **Total** | **5.85 MB** | **3.37 MB** | **58%** |

Binary format uses v1.1 sparse encoding (uint16 column index + float32 weight per non-zero entry), reducing storage by 42% overall.

## Bundle Size

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| UMD bundle (uncompressed) | < 2 MB | ~1.5 MB | **Met** |
| Gzipped | < 500 KB | ~380 KB | **Met** |

## Mobile Benchmarks (Advisory)

Mobile benchmarks (AC-4.17) require physical device testing and are advisory only.

| Device | p50 Target | p95 Target | Heap Target | Status |
|--------|-----------|-----------|-------------|--------|
| iPhone 12 | < 15 ms | < 50 ms | < 80 MB | Not tested |
| Pixel 4a | < 25 ms | < 80 ms | < 100 MB | Not tested |

## Summary

| AC | Criterion | Status |
|----|-----------|--------|
| AC-4.15a | p50 < 10 ms (tree) | **Not met** (15.95 ms) |
| AC-4.15b | p95 < 30 ms (tree) | **Met** (27.44 ms) |
| AC-4.16 | Heap < 50 MB | **Met** (-6.84 MB) |
| AC-4.12 | Bundle < 2 MB | **Met** (~1.5 MB) |
| AC-4.17 | Mobile targets | Advisory / Not tested |

The p50 target requires optimization work beyond Phase 4 scope. The tree pipeline adds dependency parsing overhead that the legacy Compromise-based pipeline did not have. This is the expected cost of explicit syntactic analysis — the correctness gains (90.3% entity F1, dependency-based role assignment) justify the latency increase, and the identified improvement paths can close the gap in Phase 5.
