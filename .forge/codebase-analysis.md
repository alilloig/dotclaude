---
type: codebase-analysis
created: 2026-04-13T12:30:00Z
---

## Architecture

### Plugin System (plugins/)

Manifest-first architecture. Every plugin exposes capabilities via `.claude-plugin/plugin.json`:

- **Metadata**: `name`, `version`, `description`, `author`, `keywords`
- **Capability declarations**:
  - `commands`: markdown files defining user-invokable commands
  - `skills`: directory path for domain skills
  - `agents`: array of agent markdown files for orchestration
  - `mcpServers`: object with server definitions (command, args, env)
  - `hooks/`: discovered via `hooks.json` for lifecycle/tool events (not in plugin.json)

**Data flow patterns**:
1. Command-driven: command.md interprets args -> skill/subagent workflow runs
2. MCP-backed: plugin.json registers server -> command constrains tools -> agent calls `mcp__server__tool` methods
3. Hook-enforced: tool/session events trigger hooks -> scripts inspect/block/advise

### sui-pilot (sui-pilot/)

Read-only documentation substrate. No build step, no runtime.

- `.sui-docs/`: Sui blockchain, Move, objects, transactions, SDKs (336 .mdx files)
- `.walrus-docs/`: Walrus storage, blobs, Sites, TypeScript SDK (84 .mdx files)
- `.seal-docs/`: Seal secrets, encryption, key servers (14 .mdx files)
- `AGENTS.md`: Pipe-delimited machine-readable index of all docs
- `CLAUDE.md`: Bootstrap routing file that includes @AGENTS.md
- `sync-docs.sh`: Pulls from upstream MystenLabs repos
- `generate-agents-md.sh`: Rebuilds the AGENTS.md index

### Skills Architecture (skills/)

Skill directories: `skills/<skill-name>/SKILL.md` with optional `references/`, `scripts/`, `evals/`.

**Target skills already exist**:
- `move-code-quality`: 11-category checklist-driven workflow for Move 2024 quality review
- `move-code-review`: Security/architecture review with 50+ finding types, severity weights, output schema
- `move-tests`: Test generation patterns, file organization, coverage workflow

## Patterns & Conventions

### plugin.json Schema

```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "description": "...",
  "author": { "name": "..." },
  "keywords": ["..."],
  "commands": ["./commands/cmd.md"],
  "skills": "./skills/",
  "agents": ["./agents/agent.md"],
  "mcpServers": {
    "server-name": {
      "command": "npx|node|binary",
      "args": ["..."],
      "env": { "VAR": "value" }
    }
  }
}
```

### MCP Server Patterns

1. **npm-distributed**: `"command": "npx", "args": ["package-name"]`
2. **Direct CLI**: `"command": "binary", "args": ["--flag", "arg"]`
3. **Variable expansion**: `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PROJECT_DIR}`

### Agent Definition Convention (from _meta/AGENTS.md)

YAML frontmatter: `name`, `description`, `tools`, `model`, `color`
Body structure:
1. Role statement
2. Documentation lookup requirements
3. Coding conventions
4. Verification commands
5. Project CLAUDE.md reference

### Skill YAML Frontmatter

```yaml
---
name: skill-name
description: |
  Multi-line description with trigger conditions.
  Use when: [conditions]
---
```

## Tech Stack

- **Claude Code CLI**: Host runtime for plugins
- **MCP Servers**: TypeScript/Node.js primary, spawned as stdio processes
- **Build tools**: tsc, tsup, Bun for TypeScript MCP servers
- **Dependencies**: `@modelcontextprotocol/sdk` for MCP server implementation
- **sui-pilot**: Static filesystem corpus, no runtime

### Move LSP Status

**No existing Move LSP implementation found**. Official LSP plugins (typescript-lsp, rust-analyzer-lsp) are thin wrappers expecting external binaries on PATH. No LSP-to-MCP bridge pattern exists in the codebase.

**Closest patterns**:
- `codex-bridge`: wraps external CLI directly
- `sui-wallet`: composes Playwright + Node into single MCP server

## Key Files for This Work

1. `/Users/alilloig/workspace/claudefiles/plugins/sui-wallet/.claude-plugin/plugin.json` - Best Sui plugin example with MCP
2. `/Users/alilloig/workspace/claudefiles/plugins/code-forge/.claude-plugin/plugin.json` - Best example of commands + skills + agents
3. `/Users/alilloig/workspace/claudefiles/_meta/AGENTS.md` - Domain agent definitions including move-agent
4. `/Users/alilloig/workspace/claudefiles/sui-pilot/AGENTS.md` - Machine-readable doc index
5. `/Users/alilloig/workspace/claudefiles/sui-pilot/CLAUDE.md` - Bootstrap pattern for doc injection
6. `/Users/alilloig/workspace/claudefiles/skills/move-code-quality/SKILL.md` - Move quality skill to bundle
7. `/Users/alilloig/workspace/claudefiles/skills/move-code-review/SKILL.md` - Move security skill to bundle
8. `/Users/alilloig/workspace/claudefiles/skills/move-tests/SKILL.md` - Move testing skill to bundle
9. `/Users/alilloig/workspace/claudefiles/plugins/marketplaces/claude-plugins-official/plugins/plugin-dev/skills/mcp-integration/SKILL.md` - MCP integration patterns

## Constraints & Warnings

1. **Move LSP requires custom implementation** - No existing LSP-to-MCP bridge; must build MCP server wrapping move-analyzer binary
2. **Skills already exist** - Bundle existing skills, do not recreate
3. **sui-pilot is read-only** - Integration via reference/bundling, not API
4. **Cross-platform concerns** - move-analyzer binary availability varies by platform
5. **Plugin manifest limits** - MCP servers are stdio-based, inline in plugin.json
