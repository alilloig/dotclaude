# Global Claude Code Guidelines

## Sui Move Development

### Authoritative Documentation (REQUIRED)

**BEFORE any Sui/Move/Walrus/Seal work**, consult the sui-pilot documentation copilot:

1. **Read the index**: `~/workspace/claudefiles/sui-pilot/AGENTS.md`
2. **Search the docs**: Use Grep/Read on the appropriate doc directory based on the topic:
   - **Sui/Move**: `~/workspace/claudefiles/sui-pilot/.sui-docs/` (blockchain, Move language, objects, transactions, SDKs)
   - **Walrus**: `~/workspace/claudefiles/sui-pilot/.walrus-docs/` (decentralized storage, blobs, Walrus Sites, TypeScript SDK)
   - **Seal**: `~/workspace/claudefiles/sui-pilot/.seal-docs/` (secrets management, encryption, key servers, access control)
3. **Verify patterns**: Cross-reference code patterns against the official docs before writing code

**Why**: Sui Move evolves rapidly and training data goes stale. sui-pilot contains doc files across three ecosystems (Sui, Walrus, Seal) extracted from official documentation. Always prefer these docs over memory.

### Code Quality Workflow (MANDATORY)

**AFTER completing Move implementation**, run the code quality checker:

```
/move-code-quality
```

**Iterate until no issues remain**:
- Address all critical issues immediately
- Apply recommended improvements
- Re-run `/move-code-quality` after each fix cycle
- Only consider implementation complete when the tool reports no issues

This ensures all Move code follows the Move Book Code Quality Checklist standards.

### Move.toml Configuration

```toml
[package]
name = "my_package"
edition = "2024"
```

## Plan Mode Behavior

When in plan mode, actively use the AskUserQuestion tool to clarify requirements, validate assumptions, and present implementation choices before finalizing the plan. Do not write a complete plan without first gathering input through structured questions. Prefer interactive refinement over monologue-style planning.

## Claudefiles Repository Convention

### Overview

`~/.claude/` is a symlink to `~/workspace/claudefiles/`. The entire Claude Code config directory is version-controlled. Ephemeral/runtime content (sessions, projects, caches) lives physically inside the repo but is gitignored.

### Repository Path

```
~/workspace/claudefiles/   ← this IS ~/.claude/
```

### Setup (New Machine)

```bash
git clone --recurse-submodules git@github.com:alilloig/claudefiles.git ~/workspace/claudefiles
cd ~/workspace/claudefiles && bash setup.sh
```

`setup.sh` handles: symlink creation, submodule init, marketplace registration (official, impeccable, local), plugin installation, and enable/disable state. Safe to re-run.

### What's Tracked (Committed)

| Item | Path |
|---|---|
| Global instructions | `CLAUDE.md` |
| Skills | `skills/` |
| Commands | `commands/` |
| Global permissions | `settings.local.json` |
| User settings (hooks, plugins, env) | `settings.json` |
| Hook scripts | `hooks/` |
| Agent teams | `teams/` |
| Local plugins | `plugins/codex-bridge/`, `plugins/sui-wallet/`, `plugins/code-forge/` |
| Local marketplace | `plugins/local/` (symlinks to local plugins) |
| Setup script | `setup.sh` |
| Plugin state | `plugins/installed_plugins.json`, `plugins/known_marketplaces.json`, `plugins/blocklist.json` |
| Agent catalog & recipes | `_meta/AGENTS.md` |
| Sui/Walrus/Seal documentation | `sui-pilot/` (submodule) |
| Documentation & audits | `_meta/docs/` |

### What's Gitignored (Ephemeral)

Runtime data stays on disk but is never committed. See `.gitignore` for the full list. Key items:

- `projects/` — per-project session data, memory, conversation logs
- `sessions/`, `session-env/` — active session tracking
- `history.jsonl` — command history (sensitive)
- `cache/`, `debug/`, `telemetry/`, `statsig/` — runtime caches and analytics
- `plugins/cache/`, `plugins/marketplaces/` — downloaded plugin code
- `channels/` — bot tokens, access control (sensitive credentials)
- `backups/`, `plans/`, `tasks/`, `todos/` — session-scoped working data

### The Rule

**`~/.claude/` IS the repo.** Any file you add and commit is shared across machines. Any file matched by `.gitignore` stays local. No symlink management needed — just commit or ignore.

### Git Submodules

External tools and documentation are integrated as git submodules:

| Submodule | Path | Purpose |
|---|---|---|
| move-code-quality | `skills/move-code-quality/` | Move code quality checker skill |
| sui-pilot | `sui-pilot/` | Sui/Walrus/Seal documentation copilot (500+ doc files) |
| move-code-review | `skills/move-code-review/` | Move code security/architecture review |

```bash
# Clone with submodules
git clone --recurse-submodules <repo-url>

# Initialize submodules in existing clone
git submodule update --init --recursive

# Update a submodule to latest
cd sui-pilot && git pull origin main && cd ..
git add sui-pilot && git commit -m "Update sui-pilot submodule"
```

## Agent Teams

### Reference

Agent role definitions and team recipes are documented in `~/workspace/claudefiles/_meta/AGENTS.md`. **Always consult this file when creating teams.**

### When Creating Teams

1. **Read `AGENTS.md`** to find the matching team recipe and agent roles
2. **Use role prompts as the base** -- copy the system prompt template from the role definition into the agent's `prompt` parameter
3. **Append task-specific instructions** after the role prompt -- the role prompt defines expertise and constraints; the task prompt defines what to do
4. **Apply the matching recipe** for team composition -- use the role names, models, and colors from the catalog
5. **Set `planModeRequired`** based on the role default, overriding when the task warrants it

### Prompt Structure

When spawning an agent, the `prompt` parameter should follow this pattern:

```
[Role prompt from AGENTS.md]

---

[Task-specific instructions: what files to change, what to build, acceptance criteria]
```

The role prompt is reusable across tasks. The task instructions change every time.