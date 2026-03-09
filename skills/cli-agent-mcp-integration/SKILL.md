---
name: cli-agent-mcp-integration
description: |
  Pattern for integrating external CLI coding agents (Codex, Aider, Cursor, etc.)
  into Claude Code via their MCP server mode. Use when: (1) you want to call another
  AI coding agent from within Claude Code, (2) an external CLI tool exposes
  `mcp-server` or MCP stdio mode, (3) you need multi-turn conversation with an
  external agent while staying in Claude Code, (4) you're building a bridge between
  Claude Code and another AI tool. Covers the full pattern: discovery of MCP tools,
  registration via `claude mcp add`, protocol gotchas (intermediate event
  notifications, structuredContent, threadId flow), permissions, skill/command
  authoring, and testing methodology.
allowed-tools:
  - Bash
  - Read
  - Write
  - Grep
author: Claude Code
version: 1.0.0
date: 2026-03-09
---

# CLI Agent MCP Integration Pattern

## Problem

You want to invoke an external CLI coding agent (e.g., OpenAI Codex, Aider) from
within Claude Code and get structured responses back, optionally maintaining
multi-turn conversation context.

## Context / Trigger Conditions

- An external CLI tool has an `mcp-server` subcommand or MCP stdio mode
- You want to delegate tasks to another AI agent without leaving Claude Code
- You need multi-turn dialogue with the external agent
- You want Claude Code to automatically know when/how to use the external tool

## Solution

### Step 1: Discover the MCP Tool Schema

Before building anything, probe the MCP server to discover its tools:

```bash
# Send initialize + initialized + tools/list via stdin
(echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.1.0"}}}'; \
 sleep 2; \
 echo '{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}'; \
 sleep 1; \
 echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'; \
 sleep 3) | perl -e 'alarm 15; exec @ARGV' <tool> mcp-server 2>/dev/null
```

**Note:** macOS lacks `timeout`. Use `perl -e 'alarm N; exec @ARGV'` or install
`coreutils` for `gtimeout`.

### Step 2: Test Tool Invocation with Python

MCP servers may emit **intermediate event notifications** before the final
`tools/call` response. You must read through all messages until you find the one
with a matching `id`:

```python
import subprocess, json, time

proc = subprocess.Popen(
    ['<tool>', 'mcp-server'],
    stdin=subprocess.PIPE, stdout=subprocess.PIPE,
    stderr=subprocess.PIPE, text=True
)

def send(msg):
    proc.stdin.write(json.dumps(msg) + '\n')
    proc.stdin.flush()

def recv():
    line = proc.stdout.readline()
    return json.loads(line.strip()) if line else None

def recv_until_response(req_id, max_msgs=100):
    for _ in range(max_msgs):
        r = recv()
        if r and 'id' in r and r['id'] == req_id:
            return r
    return None

# Initialize handshake (required)
send({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {"name": "test", "version": "0.1.0"}
}})
recv()  # init response

send({"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}})
time.sleep(0.5)

# Call a tool
send({"jsonrpc": "2.0", "id": 10, "method": "tools/call", "params": {
    "name": "<tool-name>",
    "arguments": {"prompt": "hello"}
}})
response = recv_until_response(10)
print(json.dumps(response, indent=2))
```

### Step 3: Register in Claude Code

```bash
claude mcp add --transport stdio --scope user <name> -- <tool> mcp-server
```

This writes to `~/.claude.json` under `"mcpServers"`. Tools appear as
`mcp__<name>__<tool-name>` in Claude Code.

### Step 4: Add Permissions

In `settings.local.json` (or project-level `.claude/settings.local.json`):

```json
{
  "permissions": {
    "allow": [
      "mcp__<name>__<tool1>",
      "mcp__<name>__<tool2>"
    ]
  }
}
```

### Step 5: Create Skill + Command

**Skill** (`skills/<name>/SKILL.md`): Teaches Claude *when* to use the tools
automatically. Include trigger conditions, parameter defaults, and multi-turn
threading instructions.

**Command** (`commands/<name>.md`): Provides `/name` slash command for direct
user invocation. Include session continuity logic (store and reuse threadId).

### Step 6: Restart Claude Code

MCP servers are spawned on session start. After registration, restart the
session to activate.

## Key Protocol Gotchas

### 1. Intermediate Event Notifications

MCP servers for AI agents typically emit streaming events before the final
response. For example, Codex emits ~26 `codex/event` notifications per tool
call:

```
codex/event (session_configured)
codex/event (mcp_startup_complete)
codex/event (task_started)
codex/event (item_started)
codex/event (agent_message_content_delta) × N
codex/event (item_completed)
codex/event (agent_message)
codex/event (token_count)
codex/event (task_complete)
→ Final tools/call response (id match)
```

Claude Code's MCP client handles this transparently, but manual testing must
skip these to find the final response.

### 2. structuredContent vs content

Some MCP servers return both:

```json
{
  "result": {
    "content": [{"type": "text", "text": "response"}],
    "structuredContent": {"threadId": "...", "content": "response"}
  }
}
```

`structuredContent` carries metadata (like `threadId`) that `content` doesn't.
Claude Code currently uses `content` for display but may access
`structuredContent` for tool-specific fields.

### 3. Session Continuity via threadId

Multi-turn works by passing `threadId` from one tool call to the next. The
thread ID is a UUID that maps to server-side state (conversation context,
rollout files). Claude must store it between tool calls within a conversation.

### 4. Sandbox Policy

When bridging to another coding agent, default to `read-only` sandbox to prevent
two AI agents from making conflicting file edits. Let Claude Code be the sole
editor; use the external agent for analysis, advice, and code generation that
Claude then applies.

### 5. `--ephemeral` Prevents Resume

If the external tool has an `--ephemeral` flag, using it prevents session
persistence. Rollout files will be 0 bytes. Only use for one-shot queries
where you don't need resume capability.

## Verification

After setup, verify in a new Claude Code session:

1. The MCP tools appear (check tool list or try invoking)
2. A simple prompt returns a response
3. Multi-turn works (second call with threadId gets contextual response)
4. The skill triggers on appropriate user requests
5. The `/command` works for direct invocation

## Example: Codex Integration

**Discovery result:** `codex mcp-server` exposes:
- `codex` — start session (`prompt` required, optional `sandbox`, `model`, `cwd`)
- `codex-reply` — continue session (`prompt` + `threadId` required)

**Registration:**
```bash
claude mcp add --transport stdio --scope user codex -- codex mcp-server
```

**Multi-turn flow:**
```
Call mcp__codex__codex(prompt="explain auth", sandbox="read-only")
→ {threadId: "019cd...", content: "The auth flow..."}

Call mcp__codex__codex-reply(prompt="what about errors?", threadId="019cd...")
→ {threadId: "019cd...", content: "Error handling uses..."}
```

## Notes

- Each external agent call consumes API quota on that agent's provider (e.g.,
  OpenAI for Codex). Don't call unnecessarily.
- MCP server process lifetime = Claude Code session lifetime. It's spawned on
  session start and killed on session end.
- The external agent's auth must be configured separately (e.g., `~/.codex/auth.json`
  for Codex). Claude Code doesn't manage external agent credentials.
- See also: `codex-bridge` skill for Codex-specific usage instructions.

## References

- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Claude Code MCP Integration](https://code.claude.com/docs/en/mcp.md)
- [Codex CLI Documentation](https://developers.openai.com/codex/cli/)
- [Codex MCP Server](https://developers.openai.com/codex/cli/features/)
