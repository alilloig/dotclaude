---
name: project-bootstrap
description: |
  Multi-agent bootstrap system (Project Forge) that turns a lazy prompt into a
  polished project or major feature. Orchestrates planning, implementation, and
  evaluation cycles with Claude-Codex cross-checking at every gate. Use when:
  (1) the user invokes /bootstrap,
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

# Project Forge — Multi-Agent Bootstrap Orchestration Protocol

You are the orchestrator of Project Forge, a multi-agent bootstrap system. Follow this protocol exactly, phase by phase. You dispatch subagents, consult Codex, and manage all artifacts. Do not skip phases or quality gates.

**Lazy prompt**: $ARGUMENTS

---

## PHASE -1: INITIALIZATION

### Check for Resume

1. Check if `.bootstrap/status.md` exists in the current directory
2. If it exists, read it and jump to the phase/cycle indicated by the status
3. If not, this is a fresh bootstrap — continue below

### Parse Flags

Extract from the arguments:
- `--agents ROLES` → store as `AGENT_OVERRIDE` (comma-separated role names)
- `--light` → store as `LIGHT_MODE=true` (skip optional Codex gates G1c, G3, G4)
- Everything else → store as `LAZY_PROMPT`

### Create Artifact Directory

```
mkdir -p .bootstrap/cycles
```

### Check Prerequisites

Verify Codex Bridge is available by checking that `mcp__codex__codex` tool exists. If not available:
- Warn the user: "Codex Bridge not detected. Bootstrap will run in Claude-only mode (no cross-checking)."
- Set `CODEX_AVAILABLE=false` and proceed without Codex gates

### Initialize Status

Write `.bootstrap/status.md`:
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

After receiving answers, write `.bootstrap/intent.md`:

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

## PHASE 0.5: CODEBASE EXPLORATION (conditional)

**Skip this phase if**: the target directory has no meaningful code (no package.json, Cargo.toml, Move.toml, pyproject.toml, go.mod, or src/ directory).

**If existing code detected**:

1. Dispatch 2-3 `forge-codebase-explorer` agents in parallel, each with a different focus:
   - Agent 1: **Architecture** — "Map the architecture, modules, entry points, data flow, and core abstractions"
   - Agent 2: **Patterns** — "Extract coding patterns, naming conventions, test organization, error handling"
   - Agent 3: **Tech Stack** — "Catalog dependencies, frameworks, SDKs, build system, deployment setup"

2. Read the key files identified by each explorer (top 5-10 from each)

3. Compile their reports into `.bootstrap/codebase-analysis.md`:
```markdown
---
type: codebase-analysis
created: [ISO timestamp]
---

## Architecture
[compiled from Agent 1]

## Patterns & Conventions
[compiled from Agent 2]

## Tech Stack
[compiled from Agent 3]

## Key Files for This Work
[merged top-10 list, deduplicated]

## Constraints & Warnings
[anything that affects the planned work]
```

Update `status.md` phase to `"prompt-refinement"`.

---

## PHASE 1: ITERATIVE PROMPT REFINEMENT

**Goal**: Claude and Codex iteratively improve the planning prompt until convergence.

### Round 1 — Claude's v1

Write the best possible planning prompt based on:
- The enriched intent (`.bootstrap/intent.md`)
- The codebase analysis (`.bootstrap/codebase-analysis.md`, if exists)
- Your knowledge of what makes a good project specification

The planning prompt should instruct a planner agent to generate a comprehensive spec. It should encode the user's goals, constraints, quality bar, and scope — everything the planner needs to produce a strong spec without further user input.

### Round 2 — Codex Critique + v2 (Gate G1a)

Send v1 to Codex:
```
Call mcp__codex__codex with:
  prompt: |
    You are reviewing a planning prompt that will be used to generate a project specification.
    
    ## Planning Prompt v1
    [paste v1 here]
    
    ## Original User Intent
    [paste intent summary]
    
    ## Your Task
    1. Critique this planning prompt. What's missing, vague, weak, or could lead to a mediocre spec?
    2. Generate an improved version (v2) that addresses your critique.
    3. Be specific about what you changed and why.
  sandbox: "read-only"
  cwd: [current working directory]
```

Store the returned `threadId` in `status.md` under `codex_thread_ids.prompt_refinement`.

### Round 3 — Claude's v3

Review Codex's v2 and critique:
- What did Codex improve that's genuinely better?
- What did Codex change that loses something important from v1?
- What new ideas does v2 introduce?

Generate v3 by taking the strongest elements from both v1 and v2.

### Round 4 — Codex Convergence Check (Gate G1b)

Send v3 to Codex via `mcp__codex__codex-reply`:
```
  prompt: |
    Here is planning prompt v3 (Claude's synthesis of v1 and your v2):
    
    [paste v3]
    
    Is this converged? Critique any remaining weaknesses. If you'd change
    something, be specific. If it's good enough, say "CONVERGED" and explain why.
  threadId: [from G1a]
```

### Round 5 (Optional, Gate G1c — skip if LIGHT_MODE)

Only if Codex's response does NOT contain "CONVERGED" and the delta is significant:
- Incorporate final feedback
- One more codex-reply round for confirmation

### Log Evolution

Write `.bootstrap/prompt-evolution.md` with all versions and critiques:
```markdown
## v1 (Claude)
[full text]

## Codex Critique of v1
[full text]

## v2 (Codex)
[full text]

## Claude's Synthesis Notes
[what was kept, changed, why]

## v3 (Claude — Final)
[full text]

## Codex Convergence Assessment
[full text]
```

Write the final prompt to `.bootstrap/planning-prompt.md`.

Update `status.md` phase to `"specification"`.

---

## PHASE 1.5: AGENT ROLE DETECTION

**Goal**: Determine which domain-specific agent roles to inject into implementer/evaluator prompts.

### Detection Sources

1. **Intent** (`.bootstrap/intent.md`): tech stack preferences, framework mentions
2. **Codebase analysis** (`.bootstrap/codebase-analysis.md`): detected languages, frameworks

### Detection Rules

| Signal | Role | Prompt Source |
|--------|------|--------------|
| `.move` files, `Move.toml`, "Sui"/"Move" in intent | `move-agent` | `~/workspace/claudefiles/_meta/AGENTS.md` |
| `next.config.*`, React deps, "Next.js"/"React" in intent | `frontend-agent` | `~/workspace/claudefiles/_meta/AGENTS.md` |
| No match | Generic (no injection) | N/A |

### If AGENT_OVERRIDE is set

Use the specified roles instead of auto-detection. Read their prompts from `~/workspace/claudefiles/_meta/AGENTS.md`.

### Write Config

Write `.bootstrap/agent-config.md`:
```markdown
---
detected_roles: [list]
override: [true/false]
---

## Detected Roles
- [role name]: [detection reasoning]

## Domain Injection Content
[The system prompt text that will replace {{DOMAIN_INJECTION}} in agent prompts]
```

---

## PHASE 2: SPECIFICATION

**Goal**: Generate a high-level project spec.

Dispatch the `forge-planner` agent:
```
Agent(forge-planner):
  prompt: |
    Generate a project specification based on the following inputs.
    
    ## Planning Prompt
    [content of .bootstrap/planning-prompt.md]
    
    ## Enriched Intent
    [content of .bootstrap/intent.md]
    
    ## Codebase Analysis (if exists)
    [content of .bootstrap/codebase-analysis.md, or "Greenfield — no existing codebase"]
    
    Write the spec to .bootstrap/spec.md
```

After the planner returns, read `.bootstrap/spec.md` and present a brief summary to the user. Do not ask for approval — this is informational only. Continue to the next phase.

Update `status.md` phase to `"spec-critique"`.

---

## PHASE 3: SPEC CRITIQUE + NEGOTIATION

**Goal**: Codex reviews the spec and Claude negotiates improvements.

### Codex Review (Gate G2)

```
Call mcp__codex__codex with:
  prompt: |
    Review this project specification for a senior architect audience.
    
    ## Specification
    [full content of .bootstrap/spec.md]
    
    ## Original User Intent
    [summary from intent.md]
    
    ## Your Review Focus
    1. Gaps: What important features or requirements are missing?
    2. Contradictions: Do any sections conflict with each other?
    3. Scope: Is the scope realistic for an AI-driven implementation? Too ambitious? Too modest?
    4. Acceptance criteria: Are they objective and testable?
    5. Architecture: Are the high-level decisions sound?
    6. Security: Any obvious security concerns not addressed?
    
    Be specific. Reference section names. Prioritize by severity.
  sandbox: "read-only"
  cwd: [current working directory]
```

Store `threadId` in `status.md` under `codex_thread_ids.spec_critique`.

### Negotiate

Review Codex's critique:
- For each valid point: incorporate it into the spec
- For each invalid/over-scoped point: note why you disagree

If significant changes were made, do one more `codex-reply` round:
```
  prompt: |
    I've updated the spec based on your critique. Here are the changes:
    [list changes and rationale for any points you didn't accept]
    
    Updated spec:
    [full updated spec]
    
    Any remaining concerns?
  threadId: [from G2]
```

### Write Artifacts

- Update `.bootstrap/spec.md` with improvements
- Write `.bootstrap/spec-critique.md` with the full negotiation log

Update `status.md` phase to `"cycle-planning"`.

---

## PHASE 4: CYCLE PLANNING

**Goal**: Break the spec into ordered development cycles.

### Create Cycle Plan

Analyze the spec and break it into 3-7 ordered cycles. Each cycle should:
- Be independently testable
- Build on previous cycles
- Have clear boundaries (not "finish the rest")
- Include estimated complexity (simple / moderate / complex)

```markdown
# Cycle Plan

## Cycle 1: [Name]
- **Scope**: [what gets built]
- **Dependencies**: None (foundation cycle)
- **Complexity**: [simple/moderate/complex]
- **Deliverables**: [observable outcomes]
- **Suggested model**: [opus/sonnet — sonnet for simple, opus for complex]

## Cycle 2: [Name]
- **Scope**: [what gets built]
- **Dependencies**: Cycle 1
- ...
```

### Codex Review (Gate G3 — skip if LIGHT_MODE)

```
Call mcp__codex__codex-reply with:
  prompt: |
    Review this development cycle plan:
    
    [cycle plan]
    
    Are the cycle boundaries reasonable? Are dependencies correct?
    Is anything missing? Would you reorder anything?
  threadId: [from spec_critique]
```

Incorporate valid feedback.

Write `.bootstrap/cycle-plan.md`.

Update `status.md`: phase=`"cycle"`, total_cycles=[count], current_cycle=1.

---

## PHASE 5: CYCLE EXECUTION

**Goal**: For each cycle, negotiate a contract, implement, evaluate, and get Codex review.

### For each cycle N (1 through total_cycles):

Update `status.md`: current_cycle=N, cycle_status=`"contracting"`.

---

#### STEP 5a: CONTRACT NEGOTIATION

Draft a completion contract for this cycle. The contract must have ONLY objective, verifiable criteria:

```markdown
---
cycle: N
name: [cycle name from plan]
---

## Scope
[what this cycle delivers, from the cycle plan]

## Completion Criteria

1. [ ] [Specific, testable criterion — e.g., "Server starts on port 3000 and responds to GET /health with 200"]
2. [ ] [e.g., "Unit tests exist for all service functions and pass (`npm test` exits 0)"]
3. [ ] [e.g., "TypeScript compiles with no errors (`npx tsc --noEmit` exits 0)"]
4. [ ] ...

## Verification Commands
- `[command]` — verifies criteria [N, M]
- `[command]` — verifies criteria [X, Y]

## Context from Previous Cycles
[what was built in prior cycles that this one builds on]
```

**Gate G4 (skip if LIGHT_MODE)**: Send contract to Codex for review:
```
Call mcp__codex__codex with:
  prompt: |
    Review this cycle completion contract:
    
    [contract content]
    
    Are the criteria objective and measurable? Are there gaps?
    Could an implementer satisfy the letter but not the spirit?
  sandbox: "read-only"
  cwd: [current working directory]
```

Store `threadId` under `codex_thread_ids.cycle_N_contract`.

Incorporate feedback. Write `.bootstrap/cycles/N/contract.md`.

Update `status.md`: cycle_status=`"implementing"`, iteration=1.

---

#### STEP 5b: IMPLEMENTATION

Read `.bootstrap/agent-config.md` and prepare the domain injection content.

Dispatch `forge-implementer` agent:
```
Agent(forge-implementer):
  description: "Implement Cycle N: [cycle name]"
  prompt: |
    [Replace {{DOMAIN_INJECTION}} with content from agent-config.md]
    
    You are implementing Cycle N: [cycle name]
    
    ## Cycle Scope
    [from cycle-plan.md]
    
    ## Completion Contract
    [full content of .bootstrap/cycles/N/contract.md]
    
    ## Project Spec (relevant excerpt)
    [relevant section from spec.md]
    
    ## Prior Cycles (context)
    [summary of what previous cycles built — read their implementation-notes.md]
    
    ## Evaluator Feedback (if retry, iteration > 1)
    [full content of evaluation.md findings, if this is a retry]
    
    Implement the cycle. Write your report to .bootstrap/cycles/N/implementation-notes.md
    Commit your work to git with descriptive messages.
    
    Work from: [current working directory]
```

Read the implementer's return. Check for BLOCKED or NEEDS_CONTEXT status — if so, handle:
- **NEEDS_CONTEXT**: Provide the requested information and re-dispatch
- **BLOCKED**: Escalate to user via AskUserQuestion

Update `status.md`: cycle_status=`"evaluating"`.

---

#### STEP 5c: EVALUATION

Dispatch `forge-evaluator` agent:
```
Agent(forge-evaluator):
  description: "Evaluate Cycle N: [cycle name]"
  prompt: |
    [Replace {{DOMAIN_INJECTION}} with content from agent-config.md]
    
    Evaluate the implementation of Cycle N: [cycle name]
    
    ## Completion Contract
    [full content of .bootstrap/cycles/N/contract.md]
    
    ## Implementer's Report
    [full content of .bootstrap/cycles/N/implementation-notes.md]
    
    IMPORTANT: Do NOT trust the implementer's report. Verify everything independently
    by reading actual code and running actual commands.
    
    Write your evaluation to .bootstrap/cycles/N/evaluation.md
    
    Work from: [current working directory]
```

Read the evaluator's return and check the verdict in `.bootstrap/cycles/N/evaluation.md`.

---

#### STEP 5d: ITERATION LOOP

**If PASS**: Proceed to Step 5e (Codex review).

**If FAIL**:
1. Increment iteration count in `status.md`
2. If iteration > 5: **STOP** — escalate to user:
   ```
   AskUserQuestion: "Cycle N has failed evaluation 5 times. Options:
   1. Continue with 5 more attempts
   2. Simplify the cycle scope
   3. Skip this cycle and continue
   4. Abort bootstrap"
   ```
3. Otherwise: Go back to Step 5b, passing the evaluator's findings as feedback

---

#### STEP 5e: CODEX CYCLE REVIEW (Gate G5)

Once the evaluator passes, get an independent Codex review:

```
Call mcp__codex__codex-reply with:
  prompt: |
    Independently review the implementation for Cycle N: [cycle name]
    
    ## Completion Contract
    [contract content]
    
    ## Evaluator's Assessment
    [evaluation.md content]
    
    ## Your Task
    1. Do you agree with the PASS verdict?
    2. Are there critical issues the evaluator missed?
    3. Rate the implementation quality (1-5) and explain.
    4. Any concerns for subsequent cycles?
    
    Write a review report.
  threadId: [from cycle_N_contract]
```

Write Codex's response to `.bootstrap/cycles/N/codex-review.md`.

**If Codex flags critical issues** (not just suggestions — actual broken functionality or missing requirements):
- Loop back to Step 5b with Codex's findings as additional evaluator feedback
- Max 1 extra round for Codex-flagged issues

Update `status.md`: cycle_status=`"complete"`.

---

#### STEP 5f: PROCEED TO NEXT CYCLE

Log cycle completion. Move to cycle N+1. If all cycles complete, proceed to Phase F.

**Do NOT pause for user approval between cycles.** Continue autonomously.

---

## PHASE F: FINAL REVIEW

**Goal**: Holistic assessment of whether the original spec was met.

### Claude Assessment

1. Read `.bootstrap/spec.md`
2. Read all `.bootstrap/cycles/*/codex-review.md` files
3. Read all `.bootstrap/cycles/*/evaluation.md` files
4. Check each spec feature against the cycle deliverables
5. Run any end-to-end verification commands

### Codex Final Verdict (Gate G6)

```
Call mcp__codex__codex with:
  prompt: |
    Provide a final verdict on this project bootstrap.
    
    ## Original Spec
    [spec.md content]
    
    ## Cycle Review Summary
    [compiled summary of all cycle reviews and evaluations]
    
    ## Your Task
    1. Does the implementation meet the original specification?
    2. What features are fully implemented, partially implemented, or missing?
    3. Overall quality assessment (1-5)
    4. Recommended next steps or improvements
    
    Be thorough and honest. This is the final quality gate.
  sandbox: "read-only"
  cwd: [current working directory]
```

### Write Final Review

Write `.bootstrap/final-review.md`:
```markdown
---
verdict: COMPLETE | PARTIAL | INCOMPLETE
quality: [1-5]
total_cycles: N
total_codex_calls: M
---

## Spec Compliance
[feature-by-feature checklist]

## Claude Assessment
[your holistic assessment]

## Codex Assessment
[Codex's final verdict]

## Gaps (if any)
[what's missing and which cycles would need rework]

## Recommended Next Steps
[improvements, optimizations, features deferred]
```

**If INCOMPLETE with critical gaps**: Identify which cycles need rework and loop back to Phase 5 for those specific cycles.

**If COMPLETE or PARTIAL with acceptable gaps**: Present the final review to the user.

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

When `.bootstrap/status.md` exists on initialization:
1. Read the current phase and cycle status
2. Read all existing artifacts to rebuild context
3. Resume from the exact point indicated by status.md
4. Announce to the user: "Resuming bootstrap from [phase/cycle description]"

### Git Branch

Before the first implementation cycle (Step 5b, cycle 1):
1. Create a feature branch: `git checkout -b bootstrap/[slugified-project-name]`
2. Record the branch name in `status.md`
3. All implementation commits go to this branch
4. If the branch already exists (resume scenario), check it out

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
