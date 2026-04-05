---
description: "Run the same prompt through code-forge and code-forge-rig in parallel, then audit both"
argument-hint: "\"<prompt>\" [--budget <usd>] [--model <model>] [--label <name>]"
---

# Forge Bench

Run a head-to-head comparison of code-forge (original) vs code-forge-rig (with enforcement hooks).

**Arguments:** $ARGUMENTS

## Instructions

1. Parse the arguments. The first quoted string is the forge prompt. Optional flags:
   - `--budget <usd>` — max spend per run (default: $50)
   - `--model <model>` — claude model alias (default: opus)
   - `--label <name>` — benchmark label (default: bench-{timestamp})

2. Run the benchmark script:
   ```bash
   bash "${CLAUDE_PLUGIN_ROOT}/scripts/forge-bench.sh" $ARGUMENTS
   ```

3. The script runs both variants in parallel and produces:
   - `.forge-bench/<label>/original/` — code-forge run artifacts
   - `.forge-bench/<label>/rig/` — code-forge-rig run artifacts
   - `.forge-bench/<label>/results.json` — combined session stats + audit scorecards

4. After the script completes, read `results.json` and present the comparison using the `/forge-compare` format.

**Warning:** This launches two autonomous Claude Code sessions with `--dangerously-skip-permissions`. Each will spend up to the budget cap. Total maximum cost = 2x budget.
