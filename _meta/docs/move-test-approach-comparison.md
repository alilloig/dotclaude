# Move Test Creation: Approach Comparison & Recommendation

**Date:** 2026-04-08

## Problem Summary

There is a clear gap in the current Move development skill pipeline: `move-code-review` identifies test gaps (TST-CV-1 through TST-VL-3), `move-code-quality` checks quality, but **nothing generates tests**. The question is which approach best fills this gap:

1. **The `move-tests.md` skill** (from MystenLabs/skill-garden)
2. **Sui Pilot docs** (local submodule with 370+ extracted docs)
3. **Online sources** (fetching from docs.sui.io, move-book.com at runtime)

## Codebase Findings

### Current Move Skill Pipeline
| Skill | Does | Doesn't |
|-------|------|---------|
| `move-code-review` | Flags 5 TST-* findings (missing coverage, unhappy paths, bounds, loops, time edges) | Generate tests to fill those gaps |
| `move-code-quality` | Checks 50+ quality rules including test structure | Create tests |
| `move-call-chains` | Maps function flows as Mermaid diagrams | Anything test-related |

**Gap:** No skill creates Move tests. The review skill says "you're missing tests here" but nothing says "here's how to write them."

### Sui Pilot Testing Coverage
- 370 docs total, **32 mention testing** (8.6%)
- Only **5 inline `#[test` code examples** across 3 files
- Best doc: `trustless-swap.mdx` (8+ test functions, test_scenario patterns)
- Good on: test_scenario, `#[test]`, `#[expected_failure]`, CLI commands, debugger
- Missing: advanced patterns, fuzzing, event testing, system object mocking
- Estimated coverage: **~35-40%** of comprehensive testing needs
- Content is **scattered** — not consolidated into a testing guide

### move-tests.md Skill Analysis
The skill is **~200 lines of focused, opinionated directives**:
- **File organization**: tests/ directory, not sources/
- **Philosophy**: only test public/entry functions, avoid test_scenario unless needed
- **Patterns**: init_for_testing, _for_testing suffix helpers, cleanup with `std::unit_test::destroy`
- **Expected failures**: always specify abort codes
- **Utilities table**: 6 key testing functions with purpose
- **Coverage workflow**: `sui move test --coverage --trace`, 80% target, module-level inspection

**Notable gaps in the skill:**
- No shared object testing patterns
- No multi-party scenario examples beyond basics
- No event testing
- No Clock/Random system object patterns
- No integration with existing TST-* findings from move-code-review

## Recommendation

**The `move-tests.md` skill is the strongest primary approach**, supplemented by Sui Pilot docs for reference. Online sources are the weakest option.

### Why the skill wins

1. **Directive vs. reference**: The skill tells Claude *how* to write tests — opinionated rules, patterns, file organization. Sui Pilot docs *show examples* but don't prescribe a workflow. A skill's job is to be a directive; reference material is supplementary.

2. **Completes the pipeline**: write code -> `/move-code-review` (find TST-* gaps) -> use skill to generate tests -> `/move-code-quality` (verify quality). The skill is the missing middle piece.

3. **Concise and focused**: ~200 lines of actionable content vs. hunting through 32 scattered doc files. Less token overhead, faster skill loading, clearer instructions.

4. **Correct and modern patterns**: Uses `std::unit_test::destroy` (newer API), prefers `tx_context::dummy()` over unnecessary test_scenario boilerplate, enforces `tests/` directory separation.

### Why Sui Pilot is a complement, not a replacement

- Sui Pilot shines as **reference material for specific patterns** (e.g., "how does trustless-swap test shared objects?")
- The CLAUDE.md workflow already mandates consulting Sui Pilot before writing Move code — this naturally feeds context into test writing
- When the skill says "use test_scenario for multi-transaction flows," Sui Pilot examples show concrete implementations

### Why online sources are the weakest option

- **Already captured**: Sui Pilot was extracted from these same sources
- **Network dependency**: adds latency, can fail, wastes tokens on HTML parsing
- **No curation**: Claude has to find relevant content each time instead of having it pre-organized
- **Redundant**: any update to online docs can be pulled into Sui Pilot via `git submodule update`

### Comparison Matrix

| Criterion | move-tests.md skill | Sui Pilot docs | Online sources |
|-----------|---------------------|----------------|----------------|
| **Actionability** | High — prescriptive rules | Medium — examples in context | Low — requires discovery |
| **Token cost** | Low (~200 lines loaded) | Medium (grep + read multiple files) | High (fetch + parse HTML) |
| **Reliability** | Always available | Always available | Network-dependent |
| **Currency** | Static (manual update) | Semi-static (submodule pull) | Always current |
| **Coverage depth** | Focused on patterns | Broad but scattered | Most comprehensive |
| **Integration** | Fills pipeline gap | Already integrated | Not integrated |

## Outcome

The `move-tests` skill was installed at `skills/move-tests/SKILL.md`, completing the Move skill pipeline:

```
/move-code-review  ->  /move-tests  ->  /move-code-quality
  (find gaps)        (write tests)     (verify quality)
```

### Future Enhancements

Potential additions to the skill:
- Shared object testing patterns (from Sui Pilot trustless-swap example)
- Cross-referencing TST-* findings from move-code-review
- Event testing patterns
- Clock/Random system object test patterns
