# Agent Compliance Guide

This document explains how to audit sui-move-agent behavior for compliance with the doc-first workflow.

## What Is Compliance?

The sui-move-agent enforces a **doc-first workflow**: it must consult bundled documentation before writing any Move code. This ensures generated code follows current Sui/Move best practices rather than relying on potentially outdated training data.

## Compliant Workflow

A compliant workflow follows this sequence:

1. **Doc Lookup** - Agent reads documentation files or searches bundled docs
2. **Cite Sources** - Agent references specific doc paths or patterns found
3. **Implementation** - Agent writes code informed by documentation
4. **Quality Check** - Agent suggests running `/move-code-quality`
5. **Review** - Agent suggests running `/move-code-review`

### Required Actions Before Code

At minimum, a compliant agent must:
- Read `docs/CLAUDE.md` or `docs/AGENTS.md`
- Search `.sui-docs/`, `.walrus-docs/`, or `.seal-docs/` for relevant patterns
- Cite at least one doc path in reasoning

### Example Compliant Transcript

```
User: Implement a Counter module in Move 2024

Agent: Starting doc lookup before writing any code.

### Step 1 — Read docs/CLAUDE.md
> Read `${CLAUDE_PLUGIN_ROOT}/docs/CLAUDE.md`
Found: preferred module syntax is `module pkg::name;` (no curly braces)

### Step 2 — Search bundled docs
> Grep `.sui-docs/` for `owned object`
Matched `object-model.md` — confirmed: Counter should use owned object

### Implementation
[code follows...]

After implementing, run `/move-code-quality` to verify compliance.
```

## Non-Compliant Workflow

A non-compliant workflow **writes code before consulting documentation**.

### Violation Indicators

- Code appears before any Read or Grep of doc paths
- No mention of doc files (CLAUDE.md, AGENTS.md, .sui-docs/, etc.)
- No citations to documentation sources
- Agent claims to "know" patterns without verification

### Example Non-Compliant Transcript

    User: Implement a Counter module in Move 2024

    Agent: I'll implement the Counter for you.

    ### Step 1 — Implementation (VIOLATION)

    module counter::counter {
        // Code written without doc consultation
    }

**Violation**: Code written before any doc lookup. The agent should have:
1. Read docs/CLAUDE.md
2. Searched .sui-docs/ for object patterns
3. Then implemented based on findings

## How to Audit

### Manual Audit Steps

1. **Locate the first code block** in the transcript
2. **Check preceding actions**:
   - Are there Read tool calls to doc paths?
   - Are there Grep calls searching doc directories?
   - Are there citations like "Found in object-model.md"?
3. **Verdict**:
   - If doc lookup precedes code: **COMPLIANT**
   - If code precedes doc lookup: **NON-COMPLIANT**

### Key Paths to Check

The agent should reference one or more of:
- `docs/CLAUDE.md`
- `docs/AGENTS.md`
- `.sui-docs/*`
- `.walrus-docs/*`
- `.seal-docs/*`

### Red Flags

- "I'll write the code directly"
- "Based on my knowledge of Move..."
- Code block as first action
- No file paths mentioned before implementation

## Fixture Files

Two fixture files demonstrate compliant vs non-compliant behavior:

### Compliant Fixture

**Location**: `.claude-plugin/fixtures/compliant-workflow-transcript.md`

Demonstrates:
- Doc read before coding
- Grep search of bundled docs
- Citation of specific doc paths
- Code follows doc consultation
- Quality skill invocation

### Non-Compliant Fixture

**Location**: `.claude-plugin/fixtures/non-compliant-workflow-transcript.md`

Demonstrates:
- Code written immediately
- No doc consultation
- No citations
- Detectable violation pattern

## Why This Matters

### Training Data Staleness

Sui Move evolves rapidly. Features in Move 2024 Edition didn't exist in earlier versions. The agent's training data may include:
- Outdated module syntax (curly braces vs labels)
- Deprecated function patterns
- Old import styles
- Removed features

### Doc-First Ensures Accuracy

By consulting bundled documentation:
- Code uses current patterns
- Best practices are followed
- Breaking changes are avoided
- Users get correct guidance

## Enforcement

The sui-move-agent is instructed to:
1. Always read docs before writing Move code
2. Cite sources in reasoning
3. Suggest quality checks after implementation

If an agent consistently violates this workflow, it indicates:
- System prompt not being followed
- Plugin not properly loaded
- Agent configuration issue

## Reporting Violations

If you observe non-compliant behavior:
1. Save the full transcript
2. Identify the violation point (code before docs)
3. Note which doc lookup was skipped
4. Report with transcript excerpt

Compliance auditing helps improve agent behavior and ensures users receive accurate, up-to-date Move development guidance.
