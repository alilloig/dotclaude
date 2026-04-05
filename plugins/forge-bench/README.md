# Forge Bench — A/B Benchmarking for Code Forge Variants

Benchmarking framework for comparing Code Forge plugin variants. Runs identical prompts through different forge versions, audits protocol adherence from artifacts, and produces structured comparison reports.

## Commands

| Command | Purpose |
|---------|---------|
| `/forge-audit <path>` | Audit a single `.forge/` directory for protocol adherence |
| `/forge-bench "<prompt>" [flags]` | Run same prompt through code-forge and code-forge-rig in parallel |
| `/forge-compare <bench-dir>` | Generate side-by-side comparison report from benchmark results |

## Quick Start

### Run a benchmark

```
/forge-bench "Build a real-time task management app with WebSocket collaboration" --budget 60
```

This launches two parallel Claude Code sessions:
- One with the `code-forge` plugin (original, prose-only protocol)
- One with the `code-forge-rig` plugin (with enforcement hooks)

Both get the same prompt, same budget cap, same model. Results land in `.forge-bench/<label>/`.

### Audit an existing run

```
/forge-audit /path/to/project/.forge
```

Scores 7 protocol adherence checks and outputs a JSON scorecard.

### Compare two runs

```
/forge-compare .forge-bench/bench-20260405-143200
```

Reads the benchmark results and produces a markdown report with per-check comparison, cost-benefit analysis, and a verdict.

## Benchmark Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--budget <usd>` | 50 | Maximum spend per run (total max = 2x) |
| `--model <model>` | opus | Claude model alias |
| `--label <name>` | bench-{timestamp} | Benchmark label for the output directory |

## Output Structure

```
.forge-bench/<label>/
  prompt.txt              # The input prompt
  meta.json               # Benchmark configuration
  results.json            # Combined session stats + audit scorecards
  original/
    .forge/               # Artifacts from code-forge run
    session.json          # Claude CLI output (cost, duration, turns, usage)
    stderr.log            # Session stderr
  rig/
    .forge/               # Artifacts from code-forge-rig run
    session.json          # Claude CLI output
    stderr.log            # Session stderr
```

## Audit Checks (7 total)

The auditor analyzes `.forge/` artifacts and scores each check from 0.0 to 1.0:

| Check | What It Measures |
|-------|-----------------|
| **Phase Completeness** | Were all required phases executed? (intent, planning-prompt, spec, cycle-plan, final-review) |
| **Phase Ordering** | Were artifacts created in the correct sequence? (by file modification time) |
| **Contract Compliance** | Did every cycle have a contract before implementation began? |
| **Evaluation Compliance** | Did every cycle pass evaluation before the next cycle started? |
| **Codex Gate Compliance** | Were Codex review artifacts produced at each required gate? (respects `--light`) |
| **Iteration Discipline** | Did failed evaluations trigger retries instead of being skipped? |
| **Artifact Completeness** | Are all expected per-cycle files present and non-empty? |

The **overall score** is the average of all 7 checks.

## Comparison Report Sections

`/forge-compare` produces a report with:

1. **Summary Table** — overall score, cost, duration, turns, cycles for both variants
2. **Per-Check Comparison** — side-by-side scores with winner per check
3. **Protocol Drift Analysis** — specific phases skipped, gates missed, evaluations bypassed
4. **Cost-Benefit Analysis** — whether enforcement hooks cost more but produce better adherence
5. **Verdict** — one of: rig clearly better, marginally better, no difference, original better, inconclusive

## How It Works

### Runner (`forge-bench.sh`)

1. Creates an isolated benchmark directory with two subdirectories
2. Launches two `claude` CLI sessions in parallel:
   ```bash
   claude --print --output-format json \
     --plugin-dir <plugin-path> \
     --dangerously-skip-permissions \
     --max-budget-usd <budget> \
     --model <model> \
     "/forge <prompt>"
   ```
3. Each session runs autonomously with its own plugin variant
4. After both complete, runs `forge-audit.mjs` on both `.forge/` directories
5. Merges session metadata (cost, duration, turns) with audit scorecards into `results.json`

### Auditor (`forge-audit.mjs`)

- Pure Node.js, no dependencies
- Reads `.forge/` artifacts and YAML frontmatter
- Checks file existence, modification order, frontmatter values
- Outputs a structured JSON scorecard on stdout

## Interpreting Results

### Score Ranges

| Range | Interpretation |
|-------|---------------|
| 90-100% | Strong protocol adherence — minimal drift |
| 70-89% | Moderate adherence — some phases or gates skipped |
| 50-69% | Significant drift — multiple invariants violated |
| <50% | Severe protocol breakdown — most checks failed |

### What to Look For

- **Large delta between variants** — suggests enforcement hooks are catching real drift
- **Similar scores** — the prompt may be simple enough that drift doesn't occur
- **Rig higher cost, similar score** — hooks may be adding friction without benefit for this prompt complexity
- **Rig lower cost, higher score** — hooks prevented wasted iterations from protocol violations

## Requirements

- Claude Code CLI (`claude`)
- `code-forge` and `code-forge-rig` plugins installed
- Node.js 18+ (for the auditor script)
- Python 3 (for JSON processing in the runner)

## See Also

- [code-forge](../code-forge/) — Original forge plugin (prose-only protocol)
- [code-forge-rig](../code-forge-rig/) — Enforcement-hardened variant
