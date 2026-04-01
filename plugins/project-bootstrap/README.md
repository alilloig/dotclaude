# Project Forge — Multi-Agent Bootstrap System

Turn a lazy, one-line prompt into a polished project through automated planning, implementation, and evaluation cycles with Claude-Codex cross-checking at every gate.

## Quick Start

```
/bootstrap "Build a real-time task management app with WebSocket collaboration"
```

The system will ask you 3-5 questions to sharpen your intent, then run autonomously — planning, implementing, evaluating, and reviewing in cycles until done.

## Design Philosophy

Project Forge is built on principles from [Anthropic's harness design for long-running agents](https://www.anthropic.com/engineering/harness-design-long-running-apps):

- **Generator-Evaluator Separation** — The implementer writes code, a separate skeptical evaluator checks it against a pre-agreed contract. Self-evaluation doesn't work; independent evaluation does.
- **Codex as Adversarial Reviewer** — At 8 key gates, OpenAI's Codex independently critiques Claude's work. Two different AI systems are much harder to fool than one reviewing itself.
- **Contracts Before Code** — Every cycle starts with a negotiated completion contract defining objective, measurable "done" criteria. This prevents goalpost-moving and vague quality bars.
- **Iterative Prompt Refinement** — Even the planning prompt is treated as an artifact worth improving. Claude and Codex take turns critiquing and refining it before planning begins.
- **File-Based State** — All artifacts live in `.bootstrap/`. Sessions can crash, context can compact, and the system resumes from where it left off.

## How It Works

```
/bootstrap "lazy prompt"
  |
  |-- Phase 0:   Intent Sharpening (AskUserQuestion x 3-5)
  |-- Phase 0.5: Codebase Exploration (existing repos only, 2-3 parallel agents)
  |-- Phase 1:   Iterative Prompt Refinement (Claude v1 -> Codex v2 -> Claude v3)
  |-- Phase 2:   High-Level Specification (Planner agent)
  |-- Phase 3:   Spec Critique + Negotiation (Codex review, 1-2 rounds)
  |-- Phase 4:   Cycle Planning (3-7 ordered cycles, Codex reviewed)
  |-- Phase 5+:  Implementation Cycles (per cycle):
  |     |-- 5a: Contract Negotiation (Codex reviewed)
  |     |-- 5b: Implementation (Implementer agent)
  |     |-- 5c: Evaluation (Evaluator agent, PASS/FAIL)
  |     |-- 5d: Loop until PASS (max 5 iterations)
  |     |-- 5e: Codex Cycle Review (independent report)
  |     '-- Continue to next cycle (no human pause)
  |
  '-- Phase F:   Final Review (Claude + Codex holistic verdict)
```

## Usage Examples

### Greenfield project
```
/bootstrap "Build a CLI tool in Rust that converts Markdown to beautiful PDF with syntax highlighting"
```

### Major feature in existing codebase
```
/bootstrap "Add real-time collaborative editing to the existing document editor using CRDTs"
```

### With domain-specific agents
```
/bootstrap "Build a Sui Move NFT marketplace with Next.js frontend" --agents move-agent,frontend-agent
```

### Cost-conscious mode
```
/bootstrap "Simple REST API for a todo app" --light
```

## Flags

| Flag | Description |
|------|-------------|
| `--light` | Skip optional Codex gates (G1c, G3, G4) — reduces Codex calls by ~30% |
| `--agents ROLES` | Override auto-detected agent roles (comma-separated, from `~/.claude/_meta/AGENTS.md`) |

## Artifacts

All artifacts are written to `.bootstrap/` in the project root:

| File | Phase | Content |
|------|-------|---------|
| `status.md` | all | Current state — enables resume after crash |
| `intent.md` | 0 | Enriched user intent from Q&A |
| `codebase-analysis.md` | 0.5 | Existing repo architecture map (if applicable) |
| `prompt-evolution.md` | 1 | Full log of Claude-Codex prompt refinement |
| `planning-prompt.md` | 1 | Final converged planning prompt |
| `agent-config.md` | 1.5 | Auto-detected agent roles + domain injection |
| `spec.md` | 2-3 | High-level project specification |
| `spec-critique.md` | 3 | Codex critique + negotiation log |
| `cycle-plan.md` | 4 | Ordered development cycles |
| `cycles/N/contract.md` | 5a | Objective completion criteria for cycle N |
| `cycles/N/implementation-notes.md` | 5b | Implementer's report |
| `cycles/N/evaluation.md` | 5c | Evaluator's assessment (PASS/FAIL) |
| `cycles/N/codex-review.md` | 5e | Codex's independent review |
| `final-review.md` | F | Overall verdict with spec compliance checklist |

## Agents

| Agent | Model | Color | Role |
|-------|-------|-------|------|
| `forge-planner` | opus | green | Generates high-level specs from refined prompts |
| `forge-implementer` | opus/sonnet | blue | Implements code per cycle, handles retry with feedback |
| `forge-evaluator` | opus | red | Skeptical contract-based review, runs actual verification |
| `forge-codebase-explorer` | sonnet | cyan | Fast parallel codebase mapping for existing repos |

## Auto-Detection

The system inspects your intent and codebase to detect tech stack and inject matching domain expertise from `~/.claude/_meta/AGENTS.md`:

| Signal | Injected Role | What It Adds |
|--------|--------------|-------------|
| `.move` files, `Move.toml`, "Sui" in intent | `move-agent` | Sui conventions, sui-pilot docs, `sui move test` verification |
| `next.config.*`, React deps, "Next.js" | `frontend-agent` | SSR patterns, dapp-kit, TypeScript strict mode |
| No match | Generic | No domain injection — works for any stack |

Override with `--agents move-agent,frontend-agent` to force specific roles.

## Quality Gates

The system resists "bare minimum then stop" through layered defenses:

1. **Contract pre-negotiation** — "Done" is defined before coding starts, not after
2. **Skeptical evaluator** — Reads actual code and runs actual tests, doesn't trust claims
3. **Codex independent review** — A completely separate AI validates each cycle
4. **Verification-before-completion** — Must show test output, not just say "tests pass"
5. **Multi-iteration budget** — Up to 5 impl/eval rounds per cycle
6. **Final holistic review** — Planner + Codex check all cycles against the original spec

## Cost Estimates

| Project Size | Cycles | Codex Calls | Estimated Cost (Claude + Codex) |
|-------------|--------|-------------|-------------------------------|
| Small (CLI tool) | 3 | ~12 | $30-60 |
| Medium (web app) | 5 | ~18 | $60-120 |
| Large (full-stack) | 7 | ~22 | $100-200 |

Use `--light` to reduce Codex calls by ~30%.

## Resume

If a session crashes mid-bootstrap, just run `/bootstrap` again in the same directory. The system reads `.bootstrap/status.md` and resumes from the last completed phase/cycle.

To start fresh: delete the `.bootstrap/` directory and re-run.

## Prerequisites

- **Codex Bridge** plugin installed at `~/.claude/plugins/codex-bridge/`
- **Codex CLI** authenticated (run `codex auth` if needed)
- Without Codex Bridge, the system degrades to Claude-only mode (no cross-checking)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `mcp__codex__codex` tool not found | Ensure Codex Bridge plugin is in `~/.claude/plugins/codex-bridge/` |
| Codex auth error | Run `! codex auth` in Claude Code prompt |
| Evaluator loops 5 times | System auto-escalates to user with options |
| Session crashed mid-cycle | Re-run `/bootstrap` — resumes from `status.md` |
| Want to restart from scratch | Delete `.bootstrap/` directory, then `/bootstrap` again |
| Agents use wrong domain | Use `--agents role1,role2` to override auto-detection |
