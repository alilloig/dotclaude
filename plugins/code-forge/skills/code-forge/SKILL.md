---
name: code-forge
description: |
  Multi-agent build system (Code Forge) that turns a lazy prompt into a
  polished project or major feature. Orchestrates planning, implementation, and
  evaluation cycles with Claude-Codex cross-checking at every gate. Use when:
  (1) the user invokes /forge,
  (2) the user wants to start a new project from a brief description,
  (3) the user wants to build a major new feature with structured planning and review.
allowed-tools:
  - mcp__codex__codex
  - mcp__codex__codex-reply
  - AskUserQuestion
  - Agent
  - Write
  - Read
  - Edit
  - Bash
  - Glob
  - Grep
  - TaskCreate
  - TaskUpdate
author: alilloig
version: 1.0.0
---

# Code Forge — Multi-Agent Orchestration Protocol

You are the orchestrator of Code Forge, a multi-agent build system. Follow this protocol exactly, phase by phase. You dispatch subagents, consult Codex, and manage all artifacts. Do not skip phases or quality gates.

**Lazy prompt**: $ARGUMENTS

---

## PHASE -1: INITIALIZATION

### Check for Resume

1. Check if `.forge/status.md` exists in the current directory
2. If it exists, read it and jump to the phase/cycle indicated by the status
3. If not, this is a fresh run — continue below

### Parse Flags

Extract from the arguments:
- `--agents ROLES` → store as `AGENT_OVERRIDE` (comma-separated role names)
- `--light` → store as `LIGHT_MODE=true` (skip optional Codex gates G1c, G3, G4)
- Everything else → store as `LAZY_PROMPT`

### Create Artifact Directory

```
mkdir -p .forge/cycles .forge/digests
```

### Check Prerequisites

Verify Codex Bridge is available by checking that `mcp__codex__codex` tool exists. If not available:
- Warn the user: "Codex Bridge not detected. Code Forge will run in Claude-only mode (no cross-checking)."
- Set `CODEX_AVAILABLE=false` and proceed without Codex gates

### Initialize Status

Write `.forge/status.md`:
```yaml
---
phase: "intent"
current_cycle: 0
cycle_status: "n/a"
iteration: 0
codex_thread_ids: {}
total_cycles: 0
started_at: "[current ISO timestamp]"
branch: ""
light_mode: [true/false]
agent_override: "[roles or empty]"
---
```

---

## PHASE 0: INTENT SHARPENING

**Goal**: Transform the lazy prompt into a rich, unambiguous intent document.

Use AskUserQuestion to ask 3-5 targeted questions. Adapt questions based on whether this is greenfield or an existing codebase.

### Greenfield Questions
1. **Tech stack**: "What tech stack do you want? (e.g., React + Node, Next.js + Postgres, CLI in Rust)" — offer 3-4 common options
2. **Target users**: "Who is the primary user and what problem does this solve for them?"
3. **Must-haves vs nice-to-haves**: "What are the 3-5 must-have features? What's nice-to-have but deferrable?"
4. **Deployment**: "Where will this run? (local, cloud, mobile, CLI, browser extension)"
5. **Quality bar**: "What testing/quality expectations? (MVP/prototype, production-grade, enterprise-level)"

### Existing Codebase Questions
1. **What to build**: "What specific feature or capability are you adding to the existing codebase?"
2. **Integration points**: "Which parts of the existing codebase does this touch or extend?"
3. **Must-haves vs nice-to-haves**: same as above
4. **Constraints**: "Are there architectural constraints, forbidden patterns, or conventions to follow?"
5. **Quality bar**: same as above

### Compile Intent

After receiving answers, write `.forge/intent.md`:

```markdown
---
type: intent
created: [ISO timestamp]
mode: greenfield | existing
---

## Original Prompt
[the lazy prompt]

## User Answers
[structured Q&A from AskUserQuestion]

## Derived Intent
[your synthesis: what exactly needs to be built, for whom, with what constraints]
```

Update `status.md` phase to `"exploration"`.

---

## PHASES 0.5-1.5: PREPARATION (via Preparation Orchestrator)

**Goal**: Explore the codebase, refine the planning prompt with Codex, and detect agent roles — all in an isolated context.

The preparation orchestrator handles codebase exploration (Phase 0.5), prompt refinement (Phase 1), and agent role detection (Phase 1.5). This keeps the exploration reports (~25KB) and prompt evolution (~10-15KB) out of the coordinator's context.

### Dispatch Preparation Orchestrator

```
Agent(forge-preparation-orchestrator):
  description: "Explore codebase, refine planning prompt, detect agent roles"
  prompt: |
    Run the preparation pipeline: codebase exploration, prompt refinement, and agent role detection.

    ## Intent Summary
    [brief summary of the intent — 3-5 sentences from .forge/intent.md]

    ## Configuration
    - Intent path: .forge/intent.md
    - Mode: [greenfield | existing]
    - Agent override: [roles or "none"]
    - Light mode: [true/false]
    - Codex available: [true/false]
    - Working directory: [current working directory]

    Read all input files from disk. Write codebase analysis, planning prompt, agent config, and preparation digest.
```

### Read Preparation Digest

After the preparation orchestrator returns, read `.forge/digests/preparation-digest.md`.

**Do NOT read `.forge/codebase-analysis.md`, `.forge/prompt-evolution.md`, or `.forge/planning-prompt.md` directly.** The preparation digest contains everything the coordinator needs.

If the digest is missing: check if `.forge/planning-prompt.md` exists (preparation completed but digest wasn't written). If so, compose the digest manually from existing artifacts.

Update `status.md` phase to `"specification"`.

---

## PHASES 2-4: PLANNING (via Planning Orchestrator)

**Goal**: Generate spec, critique it with Codex, and break it into ordered cycles — all in an isolated context.

The planning orchestrator handles Phases 2 (specification), 3 (spec critique), and 4 (cycle planning) in a single agent session. This keeps the 33-76KB spec and Codex negotiation out of the coordinator's context.

### Dispatch Planning Orchestrator

```
Agent(forge-planning-orchestrator):
  description: "Generate spec, critique, and cycle plan"
  prompt: |
    Run the planning pipeline: spec generation, Codex critique, and cycle planning.

    ## Preparation Summary
    [content of .forge/digests/preparation-digest.md, OR if it doesn't exist,
     a brief summary of the intent and codebase findings]

    ## Configuration
    - Intent path: .forge/intent.md
    - Planning prompt path: .forge/planning-prompt.md
    - Codebase analysis path: .forge/codebase-analysis.md (may not exist if greenfield)
    - Light mode: [true/false]
    - Codex available: [true/false]
    - Working directory: [current working directory]

    Read all input files from disk. Write spec, critique, cycle plan, and planning digest.
```

### Read Planning Digest

After the planning orchestrator returns, read `.forge/digests/planning-digest.md`.

**Do NOT read `.forge/spec.md`, `.forge/spec-critique.md`, or `.forge/cycle-plan.md` directly.** The planning digest contains everything the coordinator needs to dispatch cycle orchestrators.

Extract `total_cycles` from the digest frontmatter.

If the digest is missing: check if `.forge/cycle-plan.md` exists (planning orchestrator completed but didn't write the digest). If so, read the cycle plan and compose the digest manually.

Update `status.md`: phase=`"cycle"`, total_cycles=[count], current_cycle=1.

---

## PHASE 5: CYCLE EXECUTION

**Goal**: For each cycle, dispatch a cycle orchestrator that handles the full contract→implement→evaluate→review pipeline in an isolated context.

Each cycle runs in a separate `forge-cycle-orchestrator` agent session. This prevents cycle artifacts from accumulating in the coordinator's context — the coordinator only reads compact cycle digests (~600 bytes each).

### Git Branch (before first cycle)

Before dispatching the first cycle orchestrator:
1. Create a feature branch: `git checkout -b forge/[slugified-project-name]`
2. Record the branch name in `status.md`
3. If the branch already exists (resume scenario), check it out

### For each cycle N (1 through total_cycles):

Update `status.md`: current_cycle=N, cycle_status=`"dispatching"`.

#### Compile Prior Cycle Digests

Read all `.forge/digests/cycle-*-digest.md` files for cycles 1 through N-1. Concatenate their content into a single `prior_cycles_context` string. If N=1, this is empty.

#### Prepare Cycle Context

Extract the Cycle N entry from `.forge/cycle-plan.md` (scope, dependencies, complexity, deliverables).

Compose a brief planning summary:
- If `.forge/digests/planning-digest.md` exists, use its content
- Otherwise, write a 5-8 sentence summary of the project vision and feature list from the spec (do NOT paste the full spec — the cycle orchestrator will read relevant sections from disk)

#### Dispatch Cycle Orchestrator

```
Agent(forge-cycle-orchestrator):
  description: "Execute Cycle N: [cycle name]"
  prompt: |
    Execute Cycle N: [cycle name]

    ## Cycle Plan Entry
    [cycle N entry from cycle-plan.md]

    ## Planning Summary
    [planning summary — brief project context]

    ## Prior Cycles
    [prior_cycles_context — concatenated digests, or "No prior cycles" if N=1]

    ## Configuration
    - Cycle number: N
    - Spec path: .forge/spec.md (read relevant sections as needed — do NOT read the full spec)
    - Agent config path: .forge/agent-config.md
    - Light mode: [true/false]
    - Codex available: [true/false]
    - Git branch: [branch name from status.md]
    - Working directory: [current working directory]

    Follow the cycle protocol. Write all artifacts to .forge/cycles/N/.
    Write your digest to .forge/digests/cycle-N-digest.md when complete.
```

#### Read Digest

After the cycle orchestrator returns, read `.forge/digests/cycle-N-digest.md`.

**Do NOT read other cycle artifacts** (contract.md, implementation-notes.md, evaluation.md, codex-review.md). The digest contains everything the coordinator needs.

Check the digest verdict:
- **PASS**: Continue to next cycle
- If the digest is missing or indicates failure: check `.forge/cycles/N/evaluation.md` for details and decide whether to re-dispatch or escalate

Update `status.md`: cycle_status=`"complete"`.

#### Proceed to Next Cycle

Move to cycle N+1. If all cycles complete, proceed to Phase F.

**Do NOT pause for user approval between cycles.** Continue autonomously.

---

## PHASE F: FINAL REVIEW (via Final Review Orchestrator)

**Goal**: Holistic assessment of whether the original spec was met — in an isolated context that can load all cycle artifacts without burdening the coordinator.

### Dispatch Final Review Orchestrator

```
Agent(forge-final-review-orchestrator):
  description: "Final review — assess spec compliance"
  prompt: |
    Perform the final review of this Code Forge project.

    ## Planning Summary
    [content of .forge/digests/planning-digest.md]

    ## Cycle Summaries
    [concatenated content of all .forge/digests/cycle-*-digest.md files]

    ## Configuration
    - Spec path: .forge/spec.md (read in full — you need every feature for compliance check)
    - Cycle artifacts: .forge/cycles/*/evaluation.md, .forge/cycles/*/codex-review.md
    - Codex available: [true/false]
    - Working directory: [current working directory]

    Read all artifacts from disk. Write final-review.md and final digest.
```

### Read Final Digest

After the final review orchestrator returns, read `.forge/digests/final-digest.md`.

Check the verdict:
- **COMPLETE or PARTIAL with acceptable gaps**: Present the final digest summary to the user.
- **INCOMPLETE with critical gaps**: Read `.forge/final-review.md` for the gaps section. Identify which cycles need rework and loop back to Phase 5 for those specific cycles.

Update `status.md`: phase=`"done"`.

---

## ERROR HANDLING

### Codex Unavailable or Timeout

If any Codex call fails:
1. Retry once after 5 seconds
2. If retry fails: log the failure in the relevant artifact, proceed with Claude-only assessment
3. Note `"[Codex unavailable — Claude-only assessment]"` in the artifact

### Agent BLOCKED

If any agent reports BLOCKED:
1. Read the blocker description
2. If you can resolve it (missing context, file path issue): provide the fix and re-dispatch
3. If you cannot: escalate to user via AskUserQuestion

### Session Resume

When `.forge/status.md` exists on initialization:
1. Read the current phase and cycle status
2. **If resuming during Phase 5 (cycle execution)**:
   - Read `.forge/digests/planning-digest.md` (NOT the full spec — cycle orchestrators read spec from disk)
   - Read all existing `.forge/digests/cycle-*-digest.md` files to determine which cycles completed
   - Check `cycle_status`:
     - `"complete"`: Cycle finished. Increment to next cycle and dispatch.
     - `"dispatching"`: Coordinator crashed while cycle-orchestrator was running. Check for digest: if it exists, cycle completed (just read it). If no digest but `evaluation.md` exists with PASS, cycle completed but digest wasn't written — write the digest from the evaluation. Otherwise, re-dispatch the cycle-orchestrator.
   - Resume dispatching from the next incomplete cycle
3. **If resuming during Phases 2-4 (planning)**: Check if `.forge/digests/planning-digest.md` exists. If so, planning completed — skip to Phase 5. If not, check which planning artifacts exist (spec.md, spec-critique.md, cycle-plan.md) and re-dispatch the planning orchestrator with resume hints.
4. **If resuming during other phases (0, 0.5, 1, 1.5)**: Read all existing artifacts for that phase to rebuild context
4. Announce to the user: "Resuming forge from [phase/cycle description]"

---

## CONFIGURATION DEFAULTS

| Parameter | Default | Override |
|-----------|---------|---------|
| Max iterations per cycle | 5 | — |
| Max cycles | 7 | — |
| Max prompt refinement rounds | 3 | — |
| Max spec negotiation rounds | 2 | — |
| Codex sandbox | read-only | — |
| Implementer model (simple cycles) | sonnet | --agents |
| Implementer model (complex cycles) | opus | --agents |
| Evaluator model | opus | — |
| Light mode (skip optional gates) | false | --light |
