# `sui-move` Plugin Specification

## 1. Executive Summary

`sui-move` is a Claude Code plugin that makes Claude effective for Sui/Move development by combining four production components:

1. A specialized `sui-move-agent`
2. A `move-lsp-mcp` MCP server that adapts `move-analyzer`
3. Bundled Move skills: `move-code-quality`, `move-code-review`, `move-tests`
4. Bundled `sui-pilot` documentation snapshots for Sui, Walrus, and Seal

Primary goal: give users one installable plugin that can answer Sui/Move questions with doc-grounded guidance, generate or modify Move code, review it using existing repo skills, and expose minimum viable LSP functionality through MCP tools.

**Important enforcement note**: The doc-first workflow and quality review pipeline are soft-enforced through agent prompts and compliance testing, not hard-enforced by plugin platform mechanics. This means the agent is strongly guided to follow the workflow, and compliance is auditable through transcript inspection, but the platform cannot technically prevent bypass. This is the strongest enforcement available given current Claude Code plugin capabilities.

Target users:
- Engineers writing or reviewing Sui Move packages in Claude Code
- Teams that want repeatable Sui/Move workflows without requiring custom project prompts
- Users who have `move-analyzer` installed and want Claude-accessible language tooling

Non-goals:
- No deployment automation
- No package publishing workflows
- No non-Sui language support
- No IDE replacement
- No MCP tools beyond diagnostics, hover, completions, and go-to-definition

## 2. Assumptions and Decisions

### A. Derived From Artifacts

1. Manifest-first plugin structure is required.
   - Artifact: `plugins/sui-wallet/.claude-plugin/plugin.json` uses top-level `commands`, `skills`, and `mcpServers`.
   - Quote: `"commands": ["./commands/sui-wallet.md"], "skills": "./skills/", "mcpServers": { ... }`
   - Inference: `sui-move` should declare plugin capabilities from `.claude-plugin/plugin.json` and point at relative plugin-local folders.
   - Confidence: High

2. Multi-component plugins expose commands, a skills directory, and explicit agent files.
   - Artifact: `plugins/code-forge/.claude-plugin/plugin.json`
   - Quote: `"commands": ["./commands/forge.md"], "skills": "./skills/", "agents": ["./agents/planner.md", ...]`
   - Inference: `sui-move` should ship all three surfaces rather than hiding the agent inside a command only.
   - Confidence: High

3. Agent files are markdown with YAML frontmatter and freeform prompt body.
   - Artifact: `plugins/code-forge/agents/planner.md`
   - Quote: `name`, `description`, `tools`, `model`, `color` in frontmatter.
   - Inference: `sui-move-agent` should use the same file format and frontmatter fields.
   - Confidence: High

4. The base Move agent already mandates doc-first work and post-implementation quality checks.
   - Artifact: `_meta/AGENTS.md`, `move-agent`
   - Quote: `Before writing any Move code, consult the sui-pilot documentation`
   - Quote: `After completing any Move implementation, run /move-code-quality and iterate until no issues remain.`
   - Inference: the plugin agent must preserve this ordering and strengthen it for plugin-local docs.
   - Confidence: High

5. Skill packaging convention is directory-based, not per-file declaration.
   - Artifact: both existing plugin manifests use `"skills": "./skills/"`
   - Inference: bundled Move skills should be copied into `plugins/sui-move/skills/` and discovered by directory scan.
   - Confidence: High

6. Skill trigger language is advisory, not mechanically enforced by the manifest.
   - Artifact: `skills/move-code-quality/SKILL.md`
   - Quote: `Activates automatically when working with .move files or Move.toml manifests.`
   - Inference: "automatic" in skill docs reflects assistant behavior, not a hard plugin hook. The plugin cannot guarantee post-implementation invocation solely from manifest configuration.
   - Confidence: High

7. `move-code-review` defines a fixed registry and severity system that must be preserved if bundled.
   - Artifact: `skills/move-code-review/SKILL.md`
   - Quote: `always use the exact ID and its pre-assigned severity — do not override.`
   - Inference: the bundled copy must remain semantically identical; do not rewrite severity labels or finding IDs for plugin branding.
   - Confidence: High

8. `move-tests` expects package-root `tests/` layout and coverage commands.
   - Artifact: `skills/move-tests/SKILL.md`
   - Quote: `Tests live in the tests/ directory at the package root`
   - Inference: agent and docs should recommend that exact structure when generating tests.
   - Confidence: High

9. `sui-pilot` documentation lookup is grep-first over local snapshot directories.
   - Artifact: `sui-pilot/CLAUDE.md`
   - Quote: `Read AGENTS.md for the full file index`, `Grep the appropriate directory for your topic`
   - Artifact: `sui-pilot/AGENTS.md`
   - Quote: `Always search these docs and read before any task.`
   - Inference: plugin docs integration should use local file snapshots plus Grep/Read, not an HTTP doc service.
   - Confidence: High

### B. New Proposed Design

1. Bundle a doc snapshot inside the plugin instead of referencing the repo-level `sui-pilot/` tree.
   - New proposal because no inspected artifact shows a plugin consuming docs from outside its own root.
   - Rationale: plugins must remain relocatable and usable outside this monorepo.

2. Expose one direct agent plus three slash commands for skill routing.
   - New proposal because existing artifacts show commands and agents separately, but no Sui plugin defines the concrete entrypoint mix.
   - Rationale: direct agent use covers open-ended work; commands make skill invocation explicit and discoverable.

3. Implement `move-lsp-mcp` as a long-lived single `move-analyzer` child process per MCP server instance.
   - New proposal because no repo artifact includes an LSP adapter.
   - Rationale: hover/completion/definition require document state continuity; per-request process spawning would be slow and discard open-document state.

4. Treat workspaces as one active root per tool request, resolved from the target file upward to the nearest `Move.toml`.
   - New proposal.
   - Rationale: matches Move package semantics and avoids pretending to support full LSP multi-root when the required tools do not need it.

5. Use copied skill files plus a sync script, not symlinks.
   - New proposal.
   - Rationale: symlinks are brittle in packaged/distributed plugins; copied files are portable.

6. Ship docs as vendored snapshot content under version control, with an explicit update script.
   - New proposal.
   - Rationale: doc-first behavior cannot depend on network access at runtime.

7. Require graceful degradation when `move-analyzer` is unavailable: agent and skills remain fully usable; MCP tools return structured unavailability errors.
   - New proposal.
   - Rationale: external binary absence is expected.

### Feasibility Caveats for Auto-Triggering Skills

- `move-code-quality` after implementation: Soft-enforced. The agent prompt can require it, but the plugin cannot force every user interaction through that skill.
- `move-code-review` after quality: Soft-enforced for agent-led implementation; user-invoked otherwise.
- `move-tests` generation when tests are missing: Best-effort. The agent can recommend and invoke it, but cannot guarantee the user accepts or executes the flow.
- Skill auto-activation based on file extension or repo contents: Best-effort. Supported only through prompt/skill instructions, not hard manifest behavior.

### Enforcement Classification Summary

| Workflow Step | Classification | Reason |
|---|---|---|
| Agent reads bundled docs before generating Sui/Move code | Soft-enforced | Achieved through agent system prompt and command instructions |
| Agent searches docs with Grep in plugin-bundled directories | Soft-enforced | Depends on agent compliance |
| MCP tools expose minimum 4 Move capabilities | Hard-enforced | Implemented in code and manifest |
| Bundled skills exist and are loadable | Hard-enforced | File layout plus manifest |
| Quality review after implementation | Soft-enforced | Agent policy only |
| Security review after quality | Soft-enforced | Agent policy only |
| Tests recommended/generated when missing | Best-effort | Depends on task scope and user intent |

## 3. Plugin Architecture

### User-Facing Entrypoints

- Direct agent: `sui-move-agent`
- Slash commands:
  - `/sui-move` - route a task to `sui-move-agent`
  - `/move-code-quality` - invoke bundled quality skill
  - `/move-code-review` - invoke bundled code/security review skill (covers architecture, design, and security patterns)
  - `/move-tests` - invoke bundled test-generation skill

The agent is exposed directly and via `/sui-move`. The command exists because command discovery is visible in plugin UX; the direct agent exists because repo conventions already support standalone agents.

**Command-to-agent routing**:
- Primary mode: `/sui-move` command routes directly to `sui-move-agent` if Claude Code supports command-to-agent routing
- Fallback mode: If routing not supported, `/sui-move` command contains instructions that tell the user to invoke the agent directly
- Both modes must be testable; acceptance criteria apply to whichever mode is active

Bundled skills are invoked in practice by:
- Explicit user command: `/move-code-quality`, `/move-code-review`, `/move-tests`
- Agent instruction: the agent tells Claude to invoke the named skill by slash command
- Passive discovery: users can select the skill by name if Claude Code exposes plugin skills in UI

### Final Directory Structure

```text
plugins/sui-move/
├── .claude-plugin/
│   └── plugin.json
├── agents/
│   └── sui-move-agent.md
├── commands/
│   ├── sui-move.md
│   ├── move-code-quality.md
│   ├── move-code-review.md
│   └── move-tests.md
├── skills/
│   ├── move-code-quality/
│   │   └── SKILL.md
│   ├── move-code-review/
│   │   └── SKILL.md
│   └── move-tests/
│       └── SKILL.md
├── docs/
│   ├── CLAUDE.md
│   ├── AGENTS.md
│   ├── .sui-docs/
│   ├── .walrus-docs/
│   └── .seal-docs/
├── mcp/
│   └── move-lsp-mcp/
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── server.ts
│       │   ├── lsp-client.ts
│       │   ├── workspace.ts
│       │   ├── document-store.ts
│       │   ├── tool-handlers.ts
│       │   ├── config.ts
│       │   └── errors.ts
│       └── test/
│           ├── unit/
│           ├── integration/
│           ├── fixtures/
│           └── lifecycle/
└── scripts/
    ├── sync-skills.sh
    └── sync-sui-pilot-docs.sh
```

### `plugin.json` Example

```json
{
  "name": "sui-move",
  "version": "1.0.0",
  "description": "Sui/Move development plugin with doc-grounded agent, Move skills, and move-analyzer MCP tools.",
  "author": { "name": "alilloig" },
  "keywords": ["sui", "move", "mcp", "lsp", "security", "testing"],
  "commands": [
    "./commands/sui-move.md",
    "./commands/move-code-quality.md",
    "./commands/move-code-review.md",
    "./commands/move-tests.md"
  ],
  "skills": "./skills/",
  "agents": ["./agents/sui-move-agent.md"],
  "mcpServers": {
    "move-lsp": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/mcp/move-lsp-mcp/dist/index.js"],
      "env": {
        "MOVE_ANALYZER_PATH": "",
        "MOVE_LSP_TIMEOUT_MS": "10000",
        "MOVE_LSP_LOG_LEVEL": "info",
        "MOVE_LSP_MAX_RESTARTS": "3"
      }
    }
  }
}
```

Notes:
- `${CLAUDE_PLUGIN_ROOT}` use is a proposed dependency on plugin variable expansion. If unsupported by Claude Code runtime, replace with a packaged executable path relative to the plugin root during install/build.
- Do not declare plugin-local docs in manifest; the agent reads them through filesystem tools.

### Component Wiring Diagram

```text
User
  -> /sui-move or direct `sui-move-agent`
  -> Agent reads plugin docs index + searches bundled docs
  -> Agent implements or answers
  -> Agent routes to /move-code-quality
  -> Agent routes to /move-code-review
  -> Agent routes to /move-tests when tests are absent or requested

User or Agent
  -> MCP tool call (move_diagnostics / move_hover / move_completions / move_goto_definition)
  -> move-lsp-mcp
  -> move-analyzer stdio JSON-RPC
  -> response adapted into MCP tool output
```

### Dependency Graph

```text
sui-move plugin
  -> bundled docs snapshot
  -> bundled copied skills
  -> sui-move-agent
  -> move-lsp-mcp
      -> @modelcontextprotocol/sdk
      -> vscode-languageserver-protocol types
      -> move-analyzer (external binary)
```

### Runtime Flow

1. Plugin loads manifest.
2. Claude Code discovers commands, skills, agent, and MCP server.
3. User invokes `/sui-move` or agent directly.
4. Agent reads `docs/CLAUDE.md`, then `docs/AGENTS.md`, then greps topic-specific doc directories.
5. Agent answers or edits code.
6. For implementation tasks, agent invokes `/move-code-quality`, then `/move-code-review`, then `/move-tests` if tests are requested or missing.
7. If language tooling is needed, user or agent calls MCP tools.
8. `move-lsp-mcp` spawns or reuses `move-analyzer`, synchronizes file contents, sends LSP requests, and returns normalized JSON.

## 4. Sui & Move Agent Specification

### Full Agent System Prompt

```md
---
name: sui-move-agent
description: Sui Move specialist for implementation, testing, review, and doc-grounded guidance using bundled sui-pilot docs and Move skills.
tools: Glob, Grep, LS, Read, Edit, MultiEdit, Write, Bash, mcp__move-lsp__move_diagnostics, mcp__move-lsp__move_hover, mcp__move-lsp__move_completions, mcp__move-lsp__move_goto_definition
model: opus
color: blue
---

You are a Sui Move contract specialist working through the `sui-move` Claude Code plugin.

Your primary rule is doc-first execution. Your training knowledge about Sui, Move, Walrus, and Seal is not authoritative for this plugin. Before generating, modifying, or reviewing Sui/Move code, you must consult the bundled documentation snapshot.

Plugin-local documentation paths:
- `${CLAUDE_PLUGIN_ROOT}/docs/CLAUDE.md`
- `${CLAUDE_PLUGIN_ROOT}/docs/AGENTS.md`
- `${CLAUDE_PLUGIN_ROOT}/docs/.sui-docs/`
- `${CLAUDE_PLUGIN_ROOT}/docs/.walrus-docs/`
- `${CLAUDE_PLUGIN_ROOT}/docs/.seal-docs/`

Required workflow for any Sui/Move implementation task:
1. Read `${CLAUDE_PLUGIN_ROOT}/docs/CLAUDE.md`
2. Read `${CLAUDE_PLUGIN_ROOT}/docs/AGENTS.md`
3. Grep the relevant bundled docs directory or directories for the task topic
4. Read the most relevant matched docs before writing code
5. Implement only after the doc search is complete
6. After implementation, run `/move-code-quality`
7. Address quality findings or explicitly justify why a finding does not apply
8. Run `/move-code-review`
9. If tests are missing or requested, run `/move-tests`
10. When local tooling is available, verify with `sui move build && sui move test`

Search routing:
- Use `.sui-docs/` for Sui, Move, package, object, transaction, and framework topics
- Use `.walrus-docs/` for Walrus storage topics
- Use `.seal-docs/` for Seal encryption and secrets topics
- If unsure, search all three

Coding conventions:
- Module syntax: `module package_name::name;`
- Prefer Move 2024 Edition
- Use capability objects with `Cap` suffix
- Use past-tense event names
- Name getters after the field; no `get_` prefix
- Keep tests in `tests/` at package root
- Use `#[test]` attributes, not `test_` function naming
- Use `assert_eq!` and `std::unit_test::destroy` in tests

Allowed behaviors:
- Explain Sui/Move design using bundled docs
- Implement or refactor Move code after doc lookup
- Use MCP tools for diagnostics, hover, completion, and definition
- Invoke bundled skills by slash command
- Fall back to clearly labeled best-effort reasoning when docs do not answer the question

Disallowed behaviors:
- Do not generate Sui/Move code before doc lookup
- Do not claim docs were consulted unless you actually searched and read them
- Do not skip `/move-code-quality` after implementing Move code
- Do not present security review as complete unless `/move-code-review` was run or the user declined it
- Do not invent Sui APIs when docs and code do not support them

Fallback behavior:
- If bundled docs are missing, stale, or inconclusive, say so explicitly
- If docs are inconclusive, state that the implementation is based on best-effort inference
- If `move-analyzer` is unavailable, continue without MCP tool support and say that language tooling is degraded
```

### Workflow Policy

| Step | Policy | Enforcement |
|---|---|---|
| Read plugin-local docs bootstrap and index | Mandatory before any Sui/Move code generation or review | Soft-enforced |
| Grep bundled docs for relevant topic | Mandatory before code generation | Soft-enforced |
| Read at least one matched source doc before implementation | Mandatory | Soft-enforced |
| Implement only after doc check | Mandatory | Soft-enforced |
| Run `/move-code-quality` after implementation | Mandatory for agent-led implementation | Soft-enforced |
| Run `/move-code-review` after quality | Mandatory for contract changes (covers code quality, architecture, and security patterns) | Soft-enforced |
| Run `/move-tests` when tests are missing or requested | Recommended default | Best-effort |
| Run `sui move build && sui move test` when CLI exists | Required if local toolchain is present | Best-effort |

### Path Handling

Use `${CLAUDE_PLUGIN_ROOT}` as the canonical plugin-relative variable in all prompts and docs. If plugin variable expansion is unsupported in agent file content, resolve paths during packaging by templating absolute plugin-root-relative literals into the shipped files.

Do not reference monorepo-only paths such as `~/workspace/claudefiles/sui-pilot/...` in the final plugin.

## 5. Move LSP MCP Server Design

### Server Responsibilities

- Spawn and supervise `move-analyzer`
- Translate MCP tool calls into LSP requests
- Maintain open-document state for files touched through MCP tools
- Resolve package roots from file paths
- Normalize LSP responses into stable JSON schemas
- Return structured errors when the binary or workspace is unavailable

### Process Model

**Default architecture**: One `move-analyzer` subprocess per MCP server instance
- Lazy initialization on first tool call
- Automatic restart on crash up to `MOVE_LSP_MAX_RESTARTS`
- No per-request process spawning
- Concurrent tool requests are serialized through single LSP subprocess
- Document state namespaced by workspace root URI

**Fallback architecture** (if fixture tests show state bleed or unstable diagnostics):
- Per-workspace subprocess spawning
- Higher latency but stronger isolation
- Implementation must support switching between modes via config

Chosen because hover/completions/definition benefit from persistent document sync and initialization overhead is non-trivial. However, the shared-process model is an assumption about `move-analyzer` behavior that must be validated during Phase 1 MCP spike.

### Workspace Model

- Single active package root per request
- Resolve by walking from `filePath` upward to nearest `Move.toml`
- Cache initialized roots and file-to-root mappings (LRU, max 3 roots)
- Do not advertise full multi-root LSP support in v1

**Explicit limitations**:
- Cross-package goto-definition may fail or return incomplete results
- Nested packages with conflicting dependencies are unsupported
- If multiple packages share dependencies, state may leak between them in shared-process mode

**Failure semantics**: Returns workspace for nearest Move.toml found. If no Move.toml found, returns `NO_WORKSPACE` error. Logs warning when multi-root patterns detected.

If multiple Move packages exist in one repo, each request selects the nearest package root. Cross-package goto-definition is best-effort and limited by `move-analyzer`.

### Document Sync Strategy

- On first request for a file:
  - read file content from disk
  - send `textDocument/didOpen`
- For subsequent requests:
  - if provided `content` differs from cached content, send `textDocument/didChange`
  - otherwise reuse cached version
- On idle shutdown or explicit server shutdown:
  - send `textDocument/didClose` for tracked documents

The MCP tools accept optional unsaved `content` so Claude can query diagnostics/hover against edited but not yet persisted text.

### Scope Decisions

- `move_diagnostics` operates in both file and package modes:
  - default `scope: "file"` returns diagnostics for the requested file
  - `scope: "package"` aggregates diagnostics for all files returned by the language server for that package root
- Hover, completions, and goto-definition are file-scoped
- If no `Move.toml` is found:
  - hover/completions/definition return `NO_WORKSPACE`
  - diagnostics may optionally attempt single-file mode if `move-analyzer` supports it; otherwise return `NO_WORKSPACE`

### Lifecycle

Initialization sequence:
1. Discover binary path
2. Spawn `move-analyzer` with stdio pipes
3. Start JSON-RPC reader/writer
4. Send `initialize` with root URI and client capabilities for hover, completion, definition, and publishDiagnostics
5. Await result within timeout
6. Send `initialized`

Session management:
- Maintain monotonic document versions per URI
- Maintain pending-request map with timeout timers
- Serialize writes to the LSP subprocess

Shutdown:
- On MCP server exit, send `shutdown`, then `exit`, then kill after 2 seconds if the process remains alive

Restart/recovery:
- If child exits unexpectedly, reject in-flight requests with `LSP_CRASHED`
- Restart lazily on next request up to configured limit
- After restart, reinitialize and reopen cached documents for the active root before retrying the user request once

### Binary Management

Discovery order:
1. `MOVE_ANALYZER_PATH` env var
2. `move-analyzer` on `PATH`
3. Plugin config field `moveAnalyzerPath` if Claude Code exposes plugin config
4. Structured error `BINARY_NOT_FOUND`

Version compatibility:
- Minimum supported target: the `move-analyzer` version compatible with Move 2024 syntax and current Sui package layout
- Exact minimum version must be pinned during implementation after empirical validation against the current Sui toolchain
- Server startup should run `move-analyzer --version` when possible and warn on unknown or too-old versions

Failure behavior:
- Missing binary: do not start LSP, return `BINARY_NOT_FOUND`
- Crash on startup: return `LSP_START_FAILED`
- Crash mid-session: return `LSP_CRASHED`, auto-restart on next request
- Hangs: timeout and kill child, mark instance unhealthy
- Malformed JSON-RPC: return `LSP_PROTOCOL_ERROR` and restart child

### Configuration Surfaces

Environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `MOVE_ANALYZER_PATH` | empty | Absolute or PATH-like binary override |
| `MOVE_LSP_TIMEOUT_MS` | `10000` | Request timeout in milliseconds |
| `MOVE_LSP_MAX_RESTARTS` | `3` | Max restarts before hard failure |
| `MOVE_LSP_LOG_LEVEL` | `info` | `error`, `warn`, `info`, `debug` |
| `MOVE_LSP_DISABLE_PACKAGE_DIAGNOSTICS` | `false` | Force file-only diagnostics |

Plugin manifest config options:
- None required in v1 beyond MCP env wiring
- Optional future config if plugin system supports user-editable config:
  - `moveAnalyzerPath`
  - `timeoutMs`
  - `maxRestarts`

Per-project overrides:
- Environment variables only in v1
- No `Move.toml` plugin-specific stanza

### MCP Tool Definitions

Tool: `move_diagnostics`  
Description: Return compiler or analyzer diagnostics for a Move file, optionally aggregated at package scope.  
Input schema:

```json
{
  "type": "object",
  "required": ["filePath"],
  "properties": {
    "filePath": { "type": "string" },
    "content": { "type": "string" },
    "scope": { "type": "string", "enum": ["file", "package"], "default": "file" }
  },
  "additionalProperties": false
}
```

Output schema:

```json
{
  "type": "object",
  "required": ["workspaceRoot", "diagnostics"],
  "properties": {
    "workspaceRoot": { "type": ["string", "null"] },
    "diagnostics": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["filePath", "range", "severity", "message", "source"],
        "properties": {
          "filePath": { "type": "string" },
          "range": {
            "type": "object",
            "required": ["startLine", "startCharacter", "endLine", "endCharacter"],
            "properties": {
              "startLine": { "type": "integer" },
              "startCharacter": { "type": "integer" },
              "endLine": { "type": "integer" },
              "endCharacter": { "type": "integer" }
            }
          },
          "severity": { "type": "string", "enum": ["error", "warning", "information", "hint"] },
          "message": { "type": "string" },
          "source": { "type": "string" },
          "code": { "type": ["string", "number", "null"] }
        }
      }
    }
  }
}
```

Errors: `BINARY_NOT_FOUND`, `NO_WORKSPACE`, `LSP_TIMEOUT`, `LSP_CRASHED`, `LSP_PROTOCOL_ERROR`  
Example:

```json
{
  "request": {
    "filePath": "/repo/packages/my_pkg/sources/pool.move",
    "scope": "file"
  },
  "response": {
    "workspaceRoot": "/repo/packages/my_pkg",
    "diagnostics": [
      {
        "filePath": "/repo/packages/my_pkg/sources/pool.move",
        "range": {
          "startLine": 17,
          "startCharacter": 8,
          "endLine": 17,
          "endCharacter": 19
        },
        "severity": "error",
        "message": "Unbound module 'coin'",
        "source": "move-analyzer",
        "code": null
      }
    ]
  }
}
```

Tool: `move_hover`  
Description: Return hover text for a Move symbol at a file position.  
Input schema:

```json
{
  "type": "object",
  "required": ["filePath", "line", "character"],
  "properties": {
    "filePath": { "type": "string" },
    "content": { "type": "string" },
    "line": { "type": "integer", "minimum": 0 },
    "character": { "type": "integer", "minimum": 0 }
  },
  "additionalProperties": false
}
```

Output schema:

```json
{
  "type": "object",
  "required": ["contents"],
  "properties": {
    "contents": { "type": "string" },
    "range": {
      "type": ["object", "null"],
      "properties": {
        "startLine": { "type": "integer" },
        "startCharacter": { "type": "integer" },
        "endLine": { "type": "integer" },
        "endCharacter": { "type": "integer" }
      }
    }
  }
}
```

Errors: `BINARY_NOT_FOUND`, `NO_WORKSPACE`, `LSP_TIMEOUT`, `LSP_CRASHED`, `SYMBOL_NOT_FOUND`  
Example:

```json
{
  "request": {
    "filePath": "/repo/sources/pool.move",
    "line": 20,
    "character": 14
  },
  "response": {
    "contents": "public fun swap(pool: &mut Pool, payment: Coin<SUI>, ctx: &mut TxContext): Coin<USDC>",
    "range": {
      "startLine": 20,
      "startCharacter": 11,
      "endLine": 20,
      "endCharacter": 15
    }
  }
}
```

Tool: `move_completions`  
Description: Return completion candidates for a position in a Move file.  
Input schema:

```json
{
  "type": "object",
  "required": ["filePath", "line", "character"],
  "properties": {
    "filePath": { "type": "string" },
    "content": { "type": "string" },
    "line": { "type": "integer", "minimum": 0 },
    "character": { "type": "integer", "minimum": 0 },
    "maxItems": { "type": "integer", "minimum": 1, "maximum": 100, "default": 25 }
  },
  "additionalProperties": false
}
```

Output schema:

```json
{
  "type": "object",
  "required": ["items"],
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["label"],
        "properties": {
          "label": { "type": "string" },
          "kind": { "type": ["string", "null"] },
          "detail": { "type": ["string", "null"] },
          "documentation": { "type": ["string", "null"] },
          "insertText": { "type": ["string", "null"] }
        }
      }
    }
  }
}
```

Errors: `BINARY_NOT_FOUND`, `NO_WORKSPACE`, `LSP_TIMEOUT`, `LSP_CRASHED`  
Example:

```json
{
  "request": {
    "filePath": "/repo/sources/pool.move",
    "line": 42,
    "character": 17,
    "maxItems": 5
  },
  "response": {
    "items": [
      { "label": "balance_mut", "kind": "method", "detail": "&mut Balance<SUI>", "documentation": null, "insertText": "balance_mut" }
    ]
  }
}
```

Tool: `move_goto_definition`  
Description: Return the definition location for a symbol at a file position.  
Input schema:

```json
{
  "type": "object",
  "required": ["filePath", "line", "character"],
  "properties": {
    "filePath": { "type": "string" },
    "content": { "type": "string" },
    "line": { "type": "integer", "minimum": 0 },
    "character": { "type": "integer", "minimum": 0 }
  },
  "additionalProperties": false
}
```

Output schema:

```json
{
  "type": "object",
  "required": ["locations"],
  "properties": {
    "locations": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["filePath", "startLine", "startCharacter", "endLine", "endCharacter"],
        "properties": {
          "filePath": { "type": "string" },
          "startLine": { "type": "integer" },
          "startCharacter": { "type": "integer" },
          "endLine": { "type": "integer" },
          "endCharacter": { "type": "integer" }
        }
      }
    }
  }
}
```

Errors: `BINARY_NOT_FOUND`, `NO_WORKSPACE`, `LSP_TIMEOUT`, `LSP_CRASHED`, `SYMBOL_NOT_FOUND`  
Example:

```json
{
  "request": {
    "filePath": "/repo/sources/pool.move",
    "line": 55,
    "character": 9
  },
  "response": {
    "locations": [
      {
        "filePath": "/repo/sources/math.move",
        "startLine": 10,
        "startCharacter": 0,
        "endLine": 10,
        "endCharacter": 18
      }
    ]
  }
}
```

### Error Handling

Error codes:

| Code | Meaning |
|---|---|
| `BINARY_NOT_FOUND` | `move-analyzer` could not be located |
| `NO_WORKSPACE` | No enclosing `Move.toml` found |
| `LSP_START_FAILED` | Subprocess failed during startup/init |
| `LSP_TIMEOUT` | Request exceeded timeout |
| `LSP_CRASHED` | Subprocess terminated unexpectedly |
| `LSP_PROTOCOL_ERROR` | Malformed or invalid JSON-RPC response |
| `SYMBOL_NOT_FOUND` | Hover or definition returned no result |
| `INTERNAL_ERROR` | Unexpected adapter failure |

Handling rules:
- Timeouts kill and recycle the LSP process.
- Malformed responses are logged at `error` and treated as protocol failure.
- All tools must return deterministic JSON errors; never hang the MCP client.
- If LSP is unavailable, the agent must still function using docs and static file inspection.

## 6. Skill Bundling Strategy

| Skill | Bundling Method | Path Modifications | Update Sync | Trigger Mechanism |
|---|---|---|---|---|
| `move-code-quality` | Copy | None to core content; update examples only if plugin-local paths are introduced | `scripts/sync-skills.sh` copies from repo source | Recommended + user-invoked |
| `move-code-review` | Copy | Preserve finding registry verbatim | `scripts/sync-skills.sh` copies from repo source | Recommended + user-invoked |
| `move-tests` | Copy | None required | `scripts/sync-skills.sh` copies from repo source | Recommended + user-invoked |

Decisions:
- Copy, not symlink: safest for plugin packaging.
- Preserve skill names exactly: required for slash command parity and user familiarity.
- Keep source-of-truth in top-level `skills/`; plugin bundle is a synced derivative.

**Compatibility contract**:
- Sync script validates skill YAML frontmatter `version` field if present
- Sync script fails if source skill declares breaking changes incompatible with plugin version
- **Post-sync smoke test required**: Each bundled skill must pass a basic invocation test in plugin context before release
- Smoke test verifies: skill file loads, YAML parses, description renders, no missing references

Coordination sequence:
1. Implementation done by `sui-move-agent`
2. `/move-code-quality`
3. `/move-code-review`
4. `/move-tests` if tests are missing, requested, or review found TST-* gaps

## 7. Documentation Integration Design

| Aspect | Specification |
|---|---|
| Bundling mode | Bundled snapshot |
| Default mode | Bundled snapshot |
| Directory layout | `plugins/sui-move/docs/{CLAUDE.md,AGENTS.md,.sui-docs/,.walrus-docs/,.seal-docs/}` |
| Search strategy | Agent uses `Grep` against one or more bundled directories, then `Read` on matched files |
| Update mechanism | `scripts/sync-sui-pilot-docs.sh` copies from repo `sui-pilot/` and regenerates plugin-local `AGENTS.md`/`CLAUDE.md` if needed |
| Freshness policy | Store upstream source commit or sync timestamp in plugin docs metadata; if older than configured threshold or user reports mismatch, warn that docs may be stale |

Packaging economics:
- Estimated size: likely tens of MB once 336 Sui docs, 84 Walrus docs, and 14 Seal docs are vendored. This is acceptable for a developer plugin but must be measured during implementation.
- Bundled docs are acceptable because runtime network dependency is worse than plugin size increase.
- Docs should be vendored in git for reproducible plugin builds.
- Build/install-time generation is rejected as default because it would require source repo access or network access.

Versioning:
- Plugin version and docs snapshot version are tracked separately.
- Add `docs/VERSION.json` with:
  - plugin version
  - synced source repo revision (git SHA)
  - sync timestamp
  - **supported Sui framework version range** (e.g., "sui-framework >= 1.20.0, < 2.0.0")
  - **supported move-analyzer version range**
- User updates docs by upgrading the plugin release or rerunning the sync script in source form.

Freshness and compatibility handling:
- **Compatibility check (gating)**: Agent warns when workspace Sui framework version (from Move.toml) is outside bundled docs supported range
- **Age check (advisory)**: Agent mentions when docs are older than 30 days, but this is informational only
- Compatibility mismatch is more important than age; a 45-day-old snapshot compatible with the workspace is preferable to a 5-day-old incompatible snapshot
- The plugin does not auto-update docs at runtime.

## 8. Testing and Acceptance Criteria

| Component | Test Type | Coverage | Acceptance Criteria |
|---|---|---|---|
| MCP Server | Unit | Config parsing, binary discovery, root resolution, LSP message mapping, schema normalization | 100% of handlers and error translators covered |
| MCP Server | Integration | Real `move-analyzer` process with fixture packages | All 4 tools return valid responses against a known-good Move package |
| MCP Server | Fixture | Recorded LSP transcripts and malformed transcript replay | Adapter decodes valid frames and rejects invalid ones deterministically |
| MCP Server | Error | Missing binary, no `Move.toml`, timeout, crash, malformed JSON-RPC | Each path returns documented error code and no hung process |
| MCP Server | Lifecycle | Spawn, initialize, reopen docs after restart, clean shutdown | No orphaned child process after tests; restart path succeeds once |
| Agent | Behavior | Doc-first workflow | Compliance checks pass on scripted prompts |
| Skills | Integration | Copied bundle loads from plugin and slash commands resolve | All 3 skills discoverable and usable through plugin |
| Plugin | E2E | Agent + docs + skills + MCP | End-to-end Sui package workflow completes from prompt to review |

### Agent Compliance Testing

Observable compliance checks (doc-first evidence must be stronger than "a grep happened"):

1. Prompt asks for new or modified Move code.
2. Agent transcript must show reads of `docs/CLAUDE.md` and `docs/AGENTS.md`.
3. Agent transcript must show `Grep` against at least one bundled docs directory before any code edit.
4. **Agent must cite at least one specific doc file path in the transcript** (e.g., "Based on docs/.sui-docs/concepts/object-ownership.mdx...").
5. The doc lookup must occur **in the same task context** before code modification (not in a prior unrelated task).
6. If code is changed, transcript must show `/move-code-quality` invocation or an explicit recorded failure to invoke it.

Sample compliant transcript:
- User: "Add a transfer policy helper for object-owned transfers."
- Agent: reads `docs/CLAUDE.md`
- Agent: reads `docs/AGENTS.md`
- Agent: greps `docs/.sui-docs/` for `transfer-to-object`
- Agent: reads `docs/.sui-docs/concepts/transfer-policies.mdx`
- Agent: **cites**: "Based on transfer-policies.mdx, object-owned transfers require..."
- Agent: edits Move code
- Agent: invokes `/move-code-quality`
- Agent: invokes `/move-code-review`

Compliance failure:
- Any Move code generation before doc grep/read
- Grep without subsequent Read of a matched file
- Claiming docs were consulted without observable doc tool usage and explicit citation
- Completing an implementation task without quality review step or explicit failure note
- Doc lookup in prior task does not count for current implementation task

### MCP Tool Latency Criteria

| Metric | Target | Scope |
|--------|--------|-------|
| First response (cold start) | < 5 seconds (p95) | Includes binary startup time |
| Warm response | < 2 seconds (p95) | Binary already running, workspace initialized |
| Fixture package size | ~10 source files, ~500 LOC total | Standard test fixture |
| Hardware baseline | CI runner: 2 vCPU, 4GB RAM (GitHub Actions) | Or equivalent local machine |

Note: Latency targets are for the standard fixture package. Larger workspaces may exceed these limits.

### Cross-platform Testing

- macOS: full support, required in CI
- Linux: full support, required in CI
- Windows: **experimental in v1** - smoke tests only, not supported for production use until Phase 3 validation

## 9. Implementation Plan

### Phase 1: Minimal Viable Plugin + MCP Spike

Scope:
- Plugin manifest
- `sui-move-agent`
- `/sui-move`, `/move-code-quality`, `/move-code-review`, `/move-tests` commands
- Bundled copied skills
- Bundled docs snapshot and sync scripts
- **MCP spike: `move_diagnostics` tool end-to-end with real `move-analyzer`** (validates the riskiest architecture early)

Deliverables:
- Installable plugin directory
- Agent prompt with plugin-local doc paths
- Working skill commands
- Docs sync automation
- **Working `move_diagnostics` MCP tool against a fixture Move package**
- Installation docs for agent/skills/doc usage

Dependencies:
- Finalize plugin-root path handling strategy
- **Validate `move-analyzer` behavior on macOS and Linux with fixture package**

Exit criteria:
- User can install plugin and use doc-first agent plus bundled skills without MCP

### Phase 2: Move LSP MCP Server

Scope:
- TypeScript `move-lsp-mcp`
- Binary discovery
- LSP session management
- Four MCP tools
- Integration and lifecycle tests

Deliverables:
- `mcp/move-lsp-mcp` implementation
- Built artifact wired into manifest
- Test fixtures with real Move packages
- Troubleshooting docs for `move-analyzer`

Dependencies:
- `move-analyzer` version validation on macOS and Linux
- Confirm MCP packaging path semantics

Exit criteria:
- All four tools work against a real Move package and degrade gracefully when the binary is missing

### Phase 3: Production Hardening

Scope:
- Crash recovery
- Timeout discipline
- Windows smoke support
- Docs version metadata
- CI matrix and release checklist

Deliverables:
- Restart and recovery logic
- Replay fixtures for protocol edge cases
- Cross-platform install docs
- Acceptance test scenarios

Dependencies:
- Empirical error cases from real `move-analyzer` runs

Exit criteria:
- Plugin passes CI matrix, has complete docs, and has deterministic behavior for all documented failure modes

Risk mitigation for LSP complexity:
- Keep v1 tool surface to four operations only
- Use one-root-per-request semantics
- Build protocol transcript fixtures early
- Treat unsupported `move-analyzer` behavior as explicit documented limitations instead of silent partial support

## 10. User Documentation Requirements

Required documents:
- Installation guide for plugin
- `move-analyzer` installation guide
- Platform-specific setup for macOS, Linux, and Windows
- Configuration reference for all env vars and defaults
- Usage examples for common flows:
  - answer a Sui/Move API question
  - generate a new Move module
  - review an existing package
  - add tests
  - use MCP diagnostics/hover/definition
- Skill reference for all three bundled skills
- Troubleshooting guide for:
  - missing `move-analyzer`
  - no `Move.toml`
  - stale docs
  - Windows PATH issues
  - analyzer crash or timeout

## 11. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| `move-analyzer` not installed | MCP tools fail | High | Structured `BINARY_NOT_FOUND`, clear install docs, agent still usable |
| LSP/MCP protocol mismatch | Adapter bugs and unstable tooling | High | Explicit adapter layer, transcript fixtures, minimal scope |
| Doc staleness | Incorrect guidance | Medium | Snapshot metadata, sync script, stale-doc warnings |
| Cross-platform binary issues | Startup and process-management failures | Medium | macOS/Linux CI, Windows smoke tests, platform docs |
| Skill bundling drift | Plugin skill behavior diverges from source | Low | Sync script and release checklist |

## 12. Open Questions

1. Does Claude Code support `${CLAUDE_PLUGIN_ROOT}` expansion inside `plugin.json` `args`, or must build/install rewrite absolute paths?
2. Does Claude Code allow one command markdown file to explicitly route to a named agent, or should `/sui-move` simply instruct users to invoke the direct agent?
3. What is the minimum `move-analyzer` version that reliably supports Move 2024 and current Sui package layouts on macOS and Linux?
4. Is Windows support for `move-analyzer` mature enough for full integration testing, or should Windows remain documented as preview support in v1?
5. Can Claude Code expose plugin configuration beyond environment variables, or should all runtime configuration stay env-based in v1?
6. Does `move-analyzer` emit package-wide diagnostics in a way that can be reliably collected on demand, or will `move_diagnostics(scope=package)` need a request-plus-publishDiagnostics accumulation window?

## 13. Alternatives Considered

| Decision | Chosen Approach | Rejected Alternative(s) | Rationale |
|---|---|---|---|
| Doc integration | Bundled snapshot in plugin | External reference to repo `sui-pilot/`, runtime network fetch, build-time download only | Bundled snapshot is relocatable and offline-capable |
| Skill bundling | Copy plus sync script | Symlink, runtime reference to top-level `skills/`, regenerate from summary | Copy is packaging-safe and preserves exact skill behavior |
| LSP process model | Long-lived singleton subprocess | Per-request process, embedded library rewrite | Persistent process is required for document sync and acceptable latency |
| Workspace model | Nearest `Move.toml` per request | Full multi-root workspace graph | Simpler, matches package semantics, lower implementation risk |
| Diagnostics scope | File default with optional package mode | Package-only or file-only | File mode is faster and deterministic; package mode still available when needed |
| Skill enforcement | Agent-driven sequence | Hard plugin hooks after every edit | Hard enforcement is unsupported by observed plugin artifacts |

## Unsupported or Partially Supported Behaviors

- Hard enforcement that every user-generated Move edit is preceded by doc lookup is unsupported by the inspected plugin artifacts. Best feasible design: direct the agent with a strict system prompt and validate via behavior tests.
- Hard enforcement that `/move-code-quality` and `/move-code-review` run after every implementation is unsupported by the inspected plugin artifacts. Best feasible design: make it mandatory in the agent prompt and visible in `/sui-move` command instructions.
- A general-purpose LSP-to-MCP bridge does not exist in this repo. The feasible design is a purpose-built adapter for the four required tools only.
