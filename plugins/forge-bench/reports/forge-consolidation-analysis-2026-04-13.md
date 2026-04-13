# Forge Bench Analysis: Conclusions & Future Consolidation

**Date:** 2026-04-13
**Benchmarks analyzed:** bench-20260412-223743 (Mako PoC), plus prior runs

---

## Behavioral Patterns Observed

### Original (code-forge)
**Strengths:**
- More thorough exploration → better domain understanding
- Comprehensive test infrastructure (111 Move tests vs 108)
- Working integrations (DeepBook reads functional)
- Perfect phase ordering discipline

**Weaknesses:**
- Contract compliance gap (started cycle 2 implementation early)
- Larger output footprint (2.3x files/LOC) — potential overbuilding
- Evaluation verdicts often missing

### Rig (code-forge-rig)
**Strengths:**
- Perfect contract-first discipline (100% compliance)
- Leaner, more focused output
- Better SDK architecture separation
- Faster convergence (5 cycles vs 6)

**Weaknesses:**
- Phase ordering issue (prompt-evolution timing)
- Critical integrations stubbed (DeepBook reads)
- Fewer Move tests, shallower coverage in some areas

---

## Key Insights for Consolidated Forge

### 1. Evaluation Dispatch is Broken
Both variants had 0-20% evaluation compliance with "MISSING" verdicts. The evaluator agent either isn't being dispatched, or its output isn't captured. **Fix:** Add pre-completion hook that blocks until evaluator artifact exists with explicit PASS/FAIL.

### 2. Contract-First Should Be Default
Rig's 100% contract compliance vs Original's 83% shows the hooks work. Make contract-before-implementation the enforced behavior, not optional.

### 3. Output Size Heuristics Needed
Original's 440 files vs Rig's 228 (same quality) suggests overbuilding. Add guidance in spec phase about minimal viable scaffolding.

### 4. SDK Extraction Pattern
Rig's `@mako/sdk` separation is cleaner than Original's inline approach. Future forge specs should call out client/SDK layering early in architecture phase.

### 5. Integration Testing vs Unit Testing Tradeoff
Original prioritized working integrations (DeepBook reads). Rig prioritized structure but left integrations stubbed. For PoCs, **working integrations > clean structure**.

---

## Proposed Consolidated Forge

```
┌─────────────────────────────────────────────────────────┐
│ PREPARATION (keep as-is)                                │
│ - Codebase exploration (parallel agents)                │
│ - Intent sharpening                                     │
│ - Prompt refinement with Codex                          │
├─────────────────────────────────────────────────────────┤
│ PLANNING (keep as-is)                                   │
│ - Spec generation                                       │
│ - Codex critique + negotiation                          │
│ - Cycle planning                                        │
├─────────────────────────────────────────────────────────┤
│ CYCLES (enhanced enforcement)                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 1. Contract MUST exist before implementation starts │ │
│ │    [HOOK: block Edit/Write until contract.md exists]│ │
│ │                                                     │ │
│ │ 2. Implementation phase                             │ │
│ │                                                     │ │
│ │ 3. Evaluator MUST run and produce verdict           │ │
│ │    [HOOK: block cycle completion until             │ │
│ │     evaluation.md exists with PASS/FAIL]           │ │
│ │                                                     │ │
│ │ 4. Codex review (keep as-is)                       │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ FINAL REVIEW (keep as-is)                               │
│ - Holistic assessment                                   │
│ - Codex final verdict                                   │
└─────────────────────────────────────────────────────────┘
```

---

## Specific Recommendations

1. **Merge hooks from Rig into Original** — Rig's contract enforcement works; add it to Original's more complete base

2. **Add evaluator-dispatch enforcement** — Neither variant reliably runs evaluators; make it mandatory

3. **Add output size warnings** — If implementer creates >300 files in a PoC, flag for review

4. **SDK extraction guidance** — Add to spec template: "If building a frontend, define SDK package boundaries in Section X"

5. **Integration-first for PoCs** — Add guidance: "Stubbed integrations are PoC-blocking gaps; prefer working-but-ugly over clean-but-stubbed"

---

## Benchmark Data Summary

| Run | Original Score | Rig Score | Original Files | Rig Files | Winner |
|-----|----------------|-----------|----------------|-----------|--------|
| Mako v1 (04-10) | 0.829 | 0.765 | - | - | Original |
| Baseline (04-10) | 1.0 | 0.766 | - | - | Original |
| Mako v2 (04-13) | 0.862 | 0.829 | 440 | 228 | Original |

**Pattern:** Original consistently wins on score; Rig consistently produces leaner output. Consolidation should preserve Original's thoroughness with Rig's discipline hooks.

---

## Next Steps

1. Implement evaluator-dispatch hook in forge-rig
2. Port contract-first enforcement to code-forge
3. Add output size heuristics to both
4. Test consolidated version on next benchmark
