---
type: planning-prompt
version: 4
created: 2026-04-13T12:50:00Z
codex_thread_id: 019d8663-b0f7-7690-845f-6ea9ba97281c
---

You are a specification writer producing an implementation-ready project specification for a Claude Code plugin named `sui-move`.

Your output will be used by a developer to build the plugin. Do not write a marketing overview. Write a concrete engineering spec that resolves ambiguities, calls out constraints, and makes explicit decisions.

## Primary Goal

Specify a production-grade Claude Code plugin that turns Claude into a Sui/Move development expert through:

1. A Sui/Move-focused agent
2. A Move LSP MCP server wrapping `move-analyzer`
3. Bundled Move skills
4. Integrated access to sui-pilot documentation

## Required Grounding

Before writing the spec, inspect these repo artifacts and derive conventions from them:

| Artifact | Location | What to extract |
|----------|----------|-----------------|
| Existing Sui plugin | `plugins/sui-wallet/.claude-plugin/plugin.json` | MCP server declaration pattern, skill reference pattern |
| Multi-component plugin | `plugins/code-forge/.claude-plugin/plugin.json` | Commands + skills + agents structure |
| Domain agent template | `_meta/AGENTS.md` (move-agent section) | System prompt structure, workflow constraints |
| Move quality skill | `skills/move-code-quality/SKILL.md` | Skill format, trigger patterns |
| Move security skill | `skills/move-code-review/SKILL.md` | Finding registry, severity system |
| Move testing skill | `skills/move-tests/SKILL.md` | Test pattern documentation |
| Doc index | `sui-pilot/AGENTS.md` | Pipe-delimited format, search patterns |
| Doc bootstrap | `sui-pilot/CLAUDE.md` | @include pattern, routing table |

If any requested behavior appears unsupported by these artifacts, state that clearly and propose the best feasible design.

## Project Context

### Components

1. **Sui & Move Agent** (`sui-move-agent`)
   - Specialized agent for Sui/Move tasks
   - Enforces doc-first workflow: consult sui-pilot BEFORE code generation
   - Pipeline: docs → implement → quality → security
   - Coordinates bundled skills

2. **Move LSP MCP Server** (`move-lsp-mcp`)
   - TypeScript MCP server using `@modelcontextprotocol/sdk`
   - Wraps `move-analyzer` LSP binary via JSON-RPC over stdio
   - Minimum tools: diagnostics, hover, completions, go-to-definition

3. **Bundled Skills** (existing, to be bundled/referenced)
   - `move-code-quality`: 11-category quality checklist
   - `move-code-review`: 50+ finding type security review
   - `move-tests`: Test generation patterns

4. **sui-pilot Documentation Integration**
   - Access to `.sui-docs/`, `.walrus-docs/`, `.seal-docs/`
   - Agent searches these before Sui/Move code generation

## Constraints

### Plugin Conventions
- Must follow Claude Code plugin structure in this repo
- `.claude-plugin/plugin.json` manifest
- `commands/`, `skills/`, `agents/` directories
- MCP servers declared inline in manifest

### MCP/LSP Technical
- `move-analyzer` is external prerequisite (may not be installed)
- LSP: JSON-RPC over stdio; MCP: different protocol
- No off-the-shelf LSP-to-MCP bridge exists
- Must define: binary discovery, platform support, error handling

### Quality Bar
- Production-grade implementation
- Strong error handling with graceful degradation
- Explicit test strategy with measurable criteria
- Installation and troubleshooting documentation

## Non-Goals

Do NOT expand scope to include:
- Blockchain deployment automation
- Package publishing workflows
- Extra MCP tools beyond required minimum
- Non-Sui language support
- Full IDE replacement

## Specification Sections

### 1. Executive Summary
- Plugin purpose
- Component list
- Goals and non-goals
- Target users

### 2. Assumptions and Decisions

**Structure your decisions in two categories**:

A. **Derived from artifacts**: Decisions inferred from existing repo patterns
   - Quote the artifact and what was inferred
   - Note confidence level

B. **New proposed design**: Decisions not directly supported by artifacts
   - State the decision
   - Note why it's a new proposal
   - Include brief rationale

**List explicitly**:
- Feasibility caveats for "auto-triggering" skills

Claude Code plugins have limits. If a feature is only partially enforceable (e.g., forcing quality review after every implementation), classify it as:
- **Hard-enforced**: Plugin mechanics guarantee it
- **Soft-enforced**: Agent prompt strongly recommends it
- **Best-effort**: Depends on user cooperation

### 3. Plugin Architecture

**Specify exact user-facing entrypoints**:
- Which slash commands exist (if any)
- Whether the agent is exposed directly or only via commands
- How a bundled skill is actually invoked in practice (user syntax)

**Include**:
- Final directory structure (tree format)
- Concrete `plugin.json` example
- Component wiring diagram
- Dependency graph
- Runtime flow (text-based)

### 4. Sui & Move Agent Specification

Build on the move-agent from `_meta/AGENTS.md`. Adapt for plugin context.

**Include**:
- Full agent system prompt
- Workflow policy:
  - When doc lookup is mandatory (before ANY Sui/Move code generation)
  - How docs are searched (Grep on sui-pilot directories)
  - When implementation may proceed
  - When quality/security review must run
- Allowed behaviors
- Disallowed behaviors (e.g., generating Move code without doc check)
- Fallback when docs are missing/stale/inconclusive
- How agent invokes bundled skills (command syntax or prompt reference)
- Enforcement classification (hard/soft/best-effort) for each workflow step

**Path handling**: Specify exact paths for bundled docs, accounting for plugin installation location. Use `${CLAUDE_PLUGIN_ROOT}` variable if supported.

### 5. Move LSP MCP Server Design

**Implementation-oriented, not conceptual.**

**Architecture**:
- Server responsibilities
- Process model (singleton vs per-request)
- Workspace model (single root vs multi-root)
- Document sync strategy (open/change/close)

**Scope decisions**:
- Whether diagnostics operate on a file, a package, or both
- Workspace-root resolution when multiple Move packages exist
- Behavior when no Move.toml is found

**Lifecycle**:
- Initialization sequence with move-analyzer
- Session management
- Shutdown behavior
- Restart/recovery strategy

**Binary Management**:
- Discovery order: env var → PATH → config → error
- Version compatibility requirements
- Behavior when binary is: missing, crashes, hangs, returns malformed JSON-RPC

**Configuration surfaces**:
- Plugin manifest config options
- Environment variables
- Per-project overrides (if any)
- Defaults for all configurable options

**MCP Tool Definitions** (for each tool):
```
Tool: [name]
Description: [what it does]
Input schema: [JSON schema]
Output schema: [JSON schema]
Errors: [error codes and meanings]
Example: [request/response]
```

Define at minimum:
- `move_diagnostics`: Get compiler diagnostics for a file/project
- `move_hover`: Get hover information at position
- `move_completions`: Get completions at position
- `move_goto_definition`: Navigate to definition

**Error Handling**:
- LSP timeout handling
- Malformed response handling
- Binary crash recovery
- Graceful degradation when LSP unavailable

### 6. Skill Bundling Strategy

For each skill (`move-code-quality`, `move-code-review`, `move-tests`):

| Aspect | Decision |
|--------|----------|
| Bundling method | Copy / Symlink / Reference / Generate |
| Path modifications | What changes for plugin context |
| Update sync | How source skill updates propagate |
| Trigger mechanism | Automatic / Recommended / User-invoked |

**Coordination**: How agent sequences skills (e.g., quality before security).

### 7. Documentation Integration Design

| Aspect | Specification |
|--------|---------------|
| Bundling mode | Bundled snapshot / External reference / Hybrid |
| Default mode | [chosen default] |
| Directory layout | Exact paths within plugin |
| Search strategy | Agent uses Grep on which directories |
| Update mechanism | Manual sync / Script / Version check |
| Freshness policy | How stale docs are detected/handled |

**Packaging economics**:
- Estimated size of bundled docs
- Whether bundled docs are acceptable in plugin size
- Whether docs are vendored in git or generated at build/install time
- Distribution implications

**Versioning**: If docs are bundled, how are they versioned? How does user update?

### 8. Testing and Acceptance Criteria

**Test Matrix**:

| Component | Test Type | Coverage | Acceptance Criteria |
|-----------|-----------|----------|---------------------|
| MCP Server | Unit | Core logic | All tool handlers pass |
| MCP Server | Integration | LSP communication | Real move-analyzer interaction |
| MCP Server | Fixture | Protocol | Replay recorded LSP sessions |
| MCP Server | Error | Failure paths | Graceful handling of all error cases |
| MCP Server | Lifecycle | Process mgmt | Clean spawn/shutdown, crash recovery |
| Agent | Behavior | Workflow | Observable compliance (see below) |
| Skills | Integration | Bundling | Skills load and execute correctly |
| Plugin | E2E | Full flow | User scenario works end-to-end |

**Agent compliance testing**:
Define observable compliance checks for doc-first behavior. Do not assume hard enforcement unless plugin mechanics support it. Include:
- How to verify agent searched docs before code generation
- Sample transcript demonstrating compliant behavior
- What constitutes a compliance failure

**Cross-platform**: Define which platforms are tested (macOS, Linux, Windows) and to what extent.

### 9. Implementation Plan

**Phase 1: Minimal Viable Plugin**
- Scope: [what's included - be explicit about whether MCP is included or stubbed]
- Deliverables: [concrete outputs]
- Dependencies: [blockers]
- Exit criteria: [how to know it's done]

**Phase 2: Move LSP MCP Server**
- Same structure...

**Phase 3: Production Hardening**
- Same structure...

Include risk mitigation for LSP complexity.

### 10. User Documentation Requirements

Required docs:
- Installation guide (plugin + move-analyzer)
- Platform-specific setup (macOS, Linux, Windows)
- Configuration reference (all env vars, manifest options)
- Usage examples (common workflows)
- Skill reference (what each skill does, when to use)
- Troubleshooting guide (common issues + solutions)

### 11. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| move-analyzer not installed | MCP tools fail | High | Graceful error + install guide |
| LSP/MCP protocol mismatch | Complex translation | High | Well-defined adapter layer |
| Doc staleness | Outdated guidance | Medium | Version tracking + sync script |
| Cross-platform binary issues | Platform-specific bugs | Medium | Platform-specific testing |
| Skill bundling drift | Out-of-sync skills | Low | Symlink or reference approach |

### 12. Open Questions

List unresolved questions that need answers before implementation:
1. [Question about X]
2. [Question about Y]
...

### 13. Alternatives Considered

For major architectural decisions, briefly document rejected alternatives:

| Decision | Chosen approach | Rejected alternative(s) | Rationale |
|----------|-----------------|------------------------|-----------|
| Doc integration | [choice] | [alternatives] | [why] |
| Skill bundling | [choice] | [alternatives] | [why] |
| LSP process model | [choice] | [alternatives] | [why] |
| ... | ... | ... | ... |

## Output Requirements

- Actionable and opinionated
- Grounded in repo artifacts (cite them)
- Explicit about tradeoffs
- Implementation-ready (developer can build from it)
- No hand-waving ("as appropriate", "full coverage")
- Pick one approach when multiple valid options exist; justify briefly
- Separate derived decisions from new proposals
