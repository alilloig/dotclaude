# Codex Bridge

Bridge between Claude Code and OpenAI's Codex CLI via the Model Context Protocol (MCP). Ask Codex questions, delegate subtasks, or use Codex to refine your planning prompts — all without leaving Claude Code.

## Features

- **`/codex` command** — Send prompts to Codex for execution
- **`/claudex` command** — Use Codex to iteratively refine prompts, then enter plan mode
- **Multi-turn sessions** — Maintain conversation context with Codex across multiple exchanges via `threadId`
- **Read-only by default** — Codex runs in a sandboxed read-only mode; write access requires explicit opt-in
- **Automatic skill triggering** — Claude Code recognizes when to invoke Codex or Claudex based on natural language
- **Zero custom server code** — Delegates entirely to the Codex CLI's built-in MCP server

## Prerequisites

- [Codex CLI](https://github.com/openai/codex) installed and on your PATH
- Codex authenticated — run `codex auth` in your terminal if you haven't already (credentials are stored in `~/.codex/auth.json`)
- Claude Code CLI installed

## Installation

```bash
claude plugin add /path/to/plugins/codex-bridge
```

After installing, restart your Claude Code session. The plugin spawns `codex mcp-server` as a stdio process on session start.

## Usage

### Via `/codex` command

```
/codex Explain the authentication flow in src/auth/
```

Claude Code sends the prompt to Codex and displays the response with a thread identifier. Subsequent `/codex` calls in the same conversation automatically continue the thread.

### Via natural language

Claude Code's skill system recognizes intent and calls Codex automatically:

- "Ask codex how the caching layer works"
- "Get a second opinion from codex on this approach"
- "Send this function to codex for review"
- "What would codex say about this error?"

### Output format

Codex responses are presented as:

> **Codex** (thread `019cd036`):
>
> The authentication flow works as follows...

### Via `/claudex` command (plan-mode refinement)

```
/claudex Add user authentication with JWT tokens to the Express API
```

This triggers a multi-round Claude↔Codex refinement protocol:

1. **Round 1**: Claude generates initial planning prompt (v1)
2. **Round 2**: Codex critiques v1 and generates improved v2
3. **Round 3**: Claude synthesizes v3 from both versions
4. **Round 4**: Codex confirms convergence or provides final feedback
5. **Result**: Claude enters plan mode with the refined prompt

The refined prompt instructs Claude to thoroughly investigate the codebase, analyze the problem in context, and produce a detailed implementation plan before writing code.

### `/claudex` vs `/codex`

| Aspect | `/claudex` | `/codex` |
|--------|------------|----------|
| **Purpose** | Refine prompts for Claude's planning | Execute tasks via Codex |
| **Flow** | Codex refines → Claude plans | Claude delegates → Codex executes |
| **Result** | Claude enters plan mode | Codex response returned |
| **Use when** | Complex tasks needing investigation | Quick Codex consultation |
| **Latency** | ~30-60s (multi-round) | ~15-30s (single call) |

### Natural language triggers for claudex

- "Plan how to add authentication"
- "Investigate and plan the database migration"
- "Design an approach for the caching layer"
- "Help me plan this properly"

## How It Works

```
┌─────────────┐       stdio        ┌──────────────────┐       API       ┌─────────┐
│ Claude Code  │ ──── MCP ────────▶ │ codex mcp-server │ ─────────────▶ │ OpenAI  │
│  (plugin)    │ ◀─── JSON-RPC ─── │   (Codex CLI)    │ ◀───────────── │   API   │
└─────────────┘                    └──────────────────┘                └─────────┘
```

1. **Plugin registration** — `plugin.json` declares an MCP server entry: `codex mcp-server` over stdio
2. **Session start** — Claude Code spawns the Codex MCP server process when a session begins
3. **Tool exposure** — The server exposes two tools: `mcp__codex__codex` (new session) and `mcp__codex__codex-reply` (continue session)
4. **Multi-turn flow** — Each response includes a `threadId`. Passing it to subsequent calls maintains conversation context on the Codex side
5. **Sandbox policy** — Defaults to `read-only`. If Codex suggests edits, Claude Code offers to apply them using its own tools

### Plugin structure

```
plugins/codex-bridge/
├── .claude-plugin/
│   └── plugin.json            # Manifest: MCP server + commands + skills
├── commands/
│   ├── codex.md               # /codex — send prompts to Codex
│   └── claudex.md             # /claudex — refine prompts via Codex, enter plan mode
└── skills/
    ├── codex-bridge/
    │   └── SKILL.md           # Auto-trigger for "ask codex" patterns
    └── claudex/
        └── SKILL.md           # Auto-trigger for "plan how to" patterns
```

## MCP Tools Reference

### `mcp__codex__codex` — Start a new session

Returns `{ threadId, content }`.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `prompt` | Yes | The prompt to send to Codex |
| `sandbox` | No | `"read-only"` (default), `"workspace-write"`, or `"danger-full-access"` |
| `model` | No | Model override (e.g., `"gpt-5.3-codex"`, `"o3"`) |
| `cwd` | No | Working directory for the session |
| `developer-instructions` | No | System-level instructions for Codex |
| `approval-policy` | No | `"untrusted"`, `"on-failure"`, `"on-request"`, `"never"` |
| `profile` | No | Configuration profile from Codex's `config.toml` |

### `mcp__codex__codex-reply` — Continue a session

Returns `{ threadId, content }`.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `prompt` | Yes | The follow-up prompt |
| `threadId` | Yes | Thread ID from a previous response |

## Configuration

- **Sandbox modes** — `read-only` prevents Codex from writing files (safest). `workspace-write` allows edits within the project. `danger-full-access` removes all restrictions.
- **Model override** — Pass a `model` parameter to use a specific OpenAI model instead of Codex's default.
- **Working directory** — The plugin passes the current project directory as `cwd` so Codex has access to relevant files.
- **Codex config** — Codex reads its own settings from `~/.codex/config.toml`. See the [Codex CLI documentation](https://github.com/openai/codex) for available options.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Tool not found (`mcp__codex__codex`) | Plugin not installed or MCP server failed to start | Run `claude plugin add <path>` and restart the session. Verify `codex` is on your PATH. |
| Auth error | Codex credentials expired or missing | Run `codex auth` in your terminal |
| Empty response | Codex rate limited or API error | Retry after a moment |
| Slow response (>60s) | Complex task or large codebase scan | Normal for Codex; wait or simplify the prompt |

## Notes

- **Cost** — Each Codex call consumes your OpenAI API quota. Avoid unnecessary calls.
- **Session isolation** — Codex sessions are independent from Claude Code's conversation. The `threadId` only maintains context on the Codex side.
- **Auth management** — Claude Code does not manage Codex credentials. Authentication is handled entirely by the Codex CLI (`~/.codex/auth.json`).
- **Timeout** — Complex prompts may take 30–60 seconds. This is expected behavior.
- **Process lifetime** — The MCP server process lives for the duration of the Claude Code session and is terminated when the session ends.
