---
name: claudex
description: |
  Multi-round prompt refinement for plan-mode execution via Claude↔Codex iteration.
  Use when:
  (1) User says "/claudex", "use claudex", or "claudex this"
  (2) User says "plan how to...", "investigate and plan...", "design an approach for..."
  (3) User says "refine this prompt for planning", "help me plan this properly"
  (4) User explicitly wants Codex to help improve their planning prompt before execution
  
  Do NOT trigger for:
  - Simple questions that don't require planning ("what does X do?")
  - Tasks the user wants executed immediately without planning
  - When user says "ask codex" or "/codex" (use codex-bridge skill instead)
  - Trivial tasks that don't benefit from detailed planning
allowed-tools:
  - mcp__codex__codex
  - mcp__codex__codex-reply
  - EnterPlanMode
author: alilloig
version: 1.0.0
date: 2026-04-14
---

# claudex — Multi-Round Planning Prompt Refinement

## Problem

Users want high-quality planning prompts that guide thorough codebase investigation and detailed implementation planning. Writing such prompts manually is tedious and often results in shallow investigation or incomplete plans.

## Solution

The `claudex` skill uses iterative Claude↔Codex refinement to generate comprehensive planning prompts, then enters plan mode with the refined prompt.

## When to Trigger

### Trigger Phrases (High Confidence)
- "/claudex ..."
- "use claudex to plan..."
- "claudex this task"
- "refine and plan..."

### Trigger Phrases (Medium Confidence)
- "plan how to..." (when task is non-trivial)
- "investigate and plan..."
- "design an approach for..."
- "help me plan this properly"
- "I need a detailed plan for..."

### Do NOT Trigger
- "ask codex..." → use `/codex` instead
- "what would codex say..." → use `/codex` instead
- Simple questions or lookups
- Tasks user wants done immediately
- Trivial changes (typo fixes, simple renames)

## Multi-Round Refinement Protocol

### Round 1 — Claude's v1
Generate initial planning prompt from user input covering:
- Task scope and goals
- Investigation requirements (files, patterns, dependencies)
- Analysis expectations (causes, systems, constraints, risks)
- Planning quality bar (what the plan must include)

### Round 2 — Codex Critique (Gate G1a)
Call `mcp__codex__codex` with:
- sandbox: "read-only"
- cwd: current working directory
- prompt: Ask Codex to critique v1 and generate improved v2

Store the returned `threadId`.

### Round 3 — Claude's v3 (Synthesis)
Review Codex's v2 and critique. Generate v3 by:
- Keeping strongest elements from both versions
- Resolving contradictions
- Incorporating new valuable ideas

### Round 4 — Codex Convergence (Gate G1b)
Call `mcp__codex__codex-reply` with:
- threadId: from G1a
- prompt: Ask if v3 is converged or needs more work

If response starts with "CONVERGED", proceed. Otherwise, optionally do one more round.

### After Convergence
1. Call `EnterPlanMode` tool
2. Present the refined prompt as the planning task
3. Proceed with investigation and planning

## Usage Examples

### Example 1: Explicit Command
```
User: /claudex Add real-time notifications to the dashboard

Claude: [Executes multi-round refinement]
→ v1: Initial planning prompt
→ Codex critique: "Missing WebSocket vs SSE consideration..."
→ v3: Synthesized prompt with transport layer analysis
→ CONVERGED
→ Enters plan mode with refined prompt
```

### Example 2: Natural Language Trigger
```
User: I need to plan how to add user authentication with OAuth

Claude: [Recognizes planning intent, triggers claudex]
→ Executes same multi-round protocol
→ Enters plan mode with comprehensive OAuth planning prompt
```

### Example 3: Non-Trigger (Use /codex Instead)
```
User: Ask codex what testing framework this project uses

Claude: [Does NOT trigger claudex — uses codex-bridge instead]
→ Sends question directly to Codex for answer
```

## Error Handling

- **Codex unavailable**: Retry once, then proceed with Claude-only v1
- **Empty response**: Use best available version, continue protocol
- **Max iterations**: Stop after 3 Codex calls regardless of convergence

## Comparison with /codex

| Aspect | /claudex | /codex |
|--------|----------|--------|
| Purpose | Refine prompts for Claude's planning | Execute tasks via Codex |
| Flow | Codex refines → Claude plans | Claude delegates → Codex executes |
| Result | Claude enters plan mode | Codex response returned |
| Use when | Complex tasks needing investigation | Quick Codex consultation |

## Notes

1. **Cost**: Each `/claudex` invocation makes 2-4 Codex API calls
2. **Latency**: Multi-round refinement takes ~30-60 seconds
3. **Quality**: Produces significantly better planning prompts than single-shot
4. **Fallback**: Works with Claude-only if Codex unavailable (reduced quality)
