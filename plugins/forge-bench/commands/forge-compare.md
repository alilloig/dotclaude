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
2. The file contains `original.audit` and `rig.audit` scorecards, session stats, and `code_stats`
3. Read `meta.json` to get the project directories (`dir_original` and `dir_rig`)

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
| Duration | Xm | Ym | +/-Zm |
| Turns | X | Y | +/-Z |
| Cycles Completed | X/N | Y/N | |
| Source Files | X | Y | +/-Z |
| Total LOC | X | Y | +/-Z |

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

#### 4. Code Implementation Comparison

Compare the actual source code produced by each variant. Use the project directories from `meta.json` (`dir_original` and `dir_rig`), resolved relative to the working directory where the bench was run.

**Steps:**
1. Read `code_stats` from `results.json` for both variants — file counts, LOC, extension breakdown, and file manifests
2. Identify files that exist in one variant but not the other
3. For files that exist in both, read and compare the most important ones (entry points, main modules, config files — prioritize by size and centrality)
4. If this is a review/improvement task (existing codebase), also compare against the original source in the repo root to assess what each variant actually changed

**Report sub-sections:**

##### 4a. Structural Overview

| Metric | Original | Rig | Delta |
|--------|----------|-----|-------|
| Source files | X | Y | +/-Z |
| Total LOC | X | Y | +/-Z |
| Top-level modules | list | list | |
| File types | breakdown | breakdown | |

##### 4b. Architecture Differences

Describe how each variant organized its code:
- Module structure and separation of concerns
- Naming conventions and consistency
- Files unique to one variant (what does one produce that the other doesn't?)

##### 4c. Implementation Quality Assessment

For the 3-5 most important shared files, compare:
- Completeness (does the code actually implement the requirements?)
- Error handling and edge cases
- Code clarity and idiomatics
- Test coverage (are tests present? do they look meaningful?)

##### 4d. Code Comparison Verdict

One of:
- **Original produced better code** — more complete, better structured, or more correct
- **Rig produced better code** — enforcement hooks led to more thorough implementation
- **Comparable quality** — both produced similar code despite protocol differences
- **Both incomplete** — neither variant produced fully working code
- **Cannot compare** — one or both failed before producing meaningful code

#### 5. Overall Verdict

One of:
- **Rig clearly better** — higher adherence + better code output
- **Rig marginally better** — slightly higher adherence, similar code quality
- **No significant difference** — both performed similarly
- **Original better** — rig hooks caused friction without quality improvement
- **Inconclusive** — one or both runs failed/incomplete, can't compare fairly

Include a recommendation on which variant to use going forward.
