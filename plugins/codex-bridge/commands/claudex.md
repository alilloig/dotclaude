---
allowed-tools:
  - mcp__codex__codex
  - mcp__codex__codex-reply
  - EnterPlanMode
description: "Refine a prompt through multi-round Codex iteration, then enter plan mode"
argument-hint: "<task to plan>"
---

# /claudex Command

Use iterative Claude↔Codex refinement to generate a comprehensive planning prompt, then enter plan mode with the refined prompt.

## Arguments

`$ARGUMENTS` contains the task to plan. If empty, ask the user what engineering task they want to plan.

## Multi-Round Refinement Protocol

Execute these rounds in sequence. The goal is to produce a high-quality planning prompt that will guide Claude Code through codebase investigation, analysis, and detailed implementation planning.

### Round 1 — Claude's v1

Generate the best initial planning prompt from the user's input. The planning prompt should instruct a Claude Code session (yourself, after entering plan mode) to:

1. **Treat the request as a scoped engineering task** requiring repository investigation before proposing changes
2. **Explore the codebase efficiently** to find relevant files, entry points, dependencies, configuration, and existing patterns
3. **Analyze the problem in context**, including:
   - Likely causes or approaches
   - Affected systems or flows
   - Constraints from existing architecture
   - Edge cases and risks
4. **Produce a detailed implementation plan** before writing code, including:
   - Short problem summary
   - Relevant findings from the codebase
   - Assumptions and unknowns
   - Questions that must be clarified (via AskUserQuestion)
   - Ordered implementation steps
   - Impacted files or modules
   - Testing and validation steps
   - Potential regressions or rollout concerns
5. **Use AskUserQuestion** when required information is missing, ambiguous, or materially affects the implementation plan
6. **Prefer resolving questions from the codebase first** — only use AskUserQuestion when the answer cannot be determined reliably from the repository

Structure the v1 prompt clearly with sections for scope, investigation requirements, analysis expectations, and planning quality bar.

### Round 2 — Codex Critique (Gate G1a)

Call `mcp__codex__codex` with:

```json
{
  "sandbox": "read-only",
  "cwd": "<current working directory>",
  "prompt": "You are reviewing a planning prompt that will be used to guide Claude Code through codebase investigation and implementation planning.\n\n## Planning Prompt v1\n\n<paste v1 here>\n\n## Original User Request\n\n<paste $ARGUMENTS here>\n\n## Your Task\n\n1. Critique this planning prompt. What's missing, vague, weak, or could lead to shallow investigation or incomplete planning?\n2. Consider: Does it encourage thorough exploration? Will it produce an actionable plan? Does it handle edge cases?\n3. Generate an improved version (v2) that addresses your critique.\n4. Be specific about what you changed and why."
}
```

**Store the returned `threadId`** for subsequent rounds.

Parse Codex's response to extract:
- The critique points
- The improved v2 prompt

### Round 3 — Claude's v3 (Synthesis)

Review Codex's v2 and critique. Generate v3 by synthesizing:

1. **What Codex improved** that's genuinely better than v1
2. **What v1 had** that Codex's v2 lost or weakened
3. **New ideas** from v2 worth incorporating
4. **Contradictions** that need resolution

The v3 prompt should be the strongest combination of both versions. Don't just concatenate — synthesize intelligently.

### Round 4 — Codex Convergence Check (Gate G1b)

Call `mcp__codex__codex-reply` with:

```json
{
  "threadId": "<threadId from G1a>",
  "prompt": "Here is planning prompt v3 (my synthesis of v1 and your v2):\n\n<paste v3 here>\n\nIs this converged? Critique any remaining weaknesses. If it's good enough to guide thorough investigation and planning, respond with exactly 'CONVERGED' at the start of your response. Otherwise, provide specific feedback on what still needs improvement."
}
```

### Round 5 (Optional — Gate G1c)

Only execute if:
- Codex's response does NOT start with "CONVERGED"
- The feedback identifies substantial gaps (not just stylistic preferences)

If needed:
1. Incorporate the final feedback into v4
2. Call `mcp__codex__codex-reply` one more time for confirmation
3. Proceed regardless of response (max 3 Codex calls)

## After Convergence

Once the prompt is finalized (via CONVERGED or max iterations):

1. **Call `EnterPlanMode`** to transition to plan mode

2. **Present the refined prompt** as the planning task:

```markdown
## Planning Task
*Refined via Claude↔Codex iteration*

<final refined prompt>
```

3. **Proceed with investigation and planning** following the refined prompt's instructions

## Error Handling

### Codex Unavailable
If `mcp__codex__codex` fails:
1. Retry once after a brief pause
2. If still failing, proceed with Claude-only v1 prompt
3. Note to user: "Codex unavailable — proceeding with Claude-only refinement"

### Empty or Malformed Response
If Codex returns empty or unparseable response:
1. Log the issue
2. Proceed with the best prompt version available
3. Continue the protocol

## Output Format

During refinement, show progress:

```
**Claudex Refinement**

Round 1: Generating initial planning prompt...
Round 2: Codex critique received (thread `<short-id>`)
Round 3: Synthesizing v3...
Round 4: Checking convergence... ✓ CONVERGED

Entering plan mode with refined prompt.
```

## Example

User runs: `/claudex Add user authentication with JWT tokens to the Express API`

1. Claude generates v1 planning prompt covering JWT implementation investigation
2. Codex critiques: "Missing consideration for refresh token strategy, token storage options, middleware placement"
3. Claude synthesizes v3 incorporating these points while keeping v1's focus on existing patterns
4. Codex confirms: "CONVERGED"
5. Claude enters plan mode and begins investigating the codebase per the refined prompt
