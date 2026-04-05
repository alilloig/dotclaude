---
description: "Compare two forge runs from a benchmark directory or two .forge/ paths"
argument-hint: "<bench-dir> OR <.forge-path-1> <.forge-path-2>"
---

# Forge Compare

Generate a detailed comparison report from forge benchmark results.

**Arguments:** $ARGUMENTS

## Instructions

### Option A: Benchmark directory (single argument)

If a single path is given, treat it as a `.forge-bench/<label>/` directory:
1. Read `results.json` from that directory
2. The file contains `original.audit` and `rig.audit` scorecards plus session stats

### Option B: Two .forge/ paths

If two paths are given, run the auditor on each:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/forge-audit.mjs" <path1>
node "${CLAUDE_PLUGIN_ROOT}/scripts/forge-audit.mjs" <path2>
```

### Report Format

Produce a markdown comparison report with these sections:

#### 1. Summary Table

| Metric | Original (code-forge) | Rig (code-forge-rig) | Delta |
|--------|----------------------|---------------------|-------|
| Overall Score | X% | Y% | +/-Z% |
| Cost | $X | $Y | +/-$Z |
| Duration | Xm | Ym | +/-Zm |
| Turns | X | Y | +/-Z |
| Cycles Completed | X/N | Y/N | |

#### 2. Per-Check Comparison

For each of the 7 audit checks, show both scores side by side:

| Check | Original | Rig | Winner |
|-------|----------|-----|--------|
| Phase Completeness | X% | Y% | ... |
| Phase Ordering | X% | Y% | ... |
| Contract Compliance | X% | Y% | ... |
| Evaluation Compliance | X% | Y% | ... |
| Codex Gate Compliance | X% | Y% | ... |
| Iteration Discipline | X% | Y% | ... |
| Artifact Completeness | X% | Y% | ... |

#### 3. Protocol Drift Analysis

Identify where each run deviated from the protocol:
- Which phases were skipped?
- Which Codex gates were missed?
- Were any cycles advanced without passing evaluation?
- Did enforcement hooks in the rig version actually prevent drift?

#### 4. Cost-Benefit Analysis

- Was the rig version more expensive (due to hooks blocking and forcing retries)?
- Did it produce higher quality output for the extra cost?
- Token efficiency: cost per completed cycle

#### 5. Verdict

One of:
- **Rig clearly better** — higher adherence, hooks prevented measurable drift
- **Rig marginally better** — slightly higher adherence, similar cost
- **No significant difference** — both performed similarly
- **Original better** — rig hooks caused friction without quality improvement
- **Inconclusive** — one or both runs failed/incomplete, can't compare fairly

Include a recommendation on which variant to use going forward.
