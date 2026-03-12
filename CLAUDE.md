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

All shared Claude Code configuration lives in `~/workspace/claudefiles/`, a git repo symlinked into `~/.claude/`. This keeps skills, commands, global instructions, and settings version-controlled and portable across machines.

### Repository Path

```
~/workspace/claudefiles/
```

### What Lives in the Repo (Shared)

| Item | Repo path | Symlink |
|---|---|---|
| Global instructions | `CLAUDE.md` | `~/.claude/CLAUDE.md` |
| Skills | `skills/` | `~/.claude/skills/` |
| Commands | `commands/` | `~/.claude/commands/` |
| Local settings | `settings.local.json` | `~/.claude/settings.local.json` |
| Agent catalog & recipes | `AGENTS.md` | *(none -- referenced by absolute path)* |
| Sui/Walrus/Seal documentation | `sui-pilot/` (submodule) | *(none -- referenced by absolute path)* |
| Plugins | `plugins/` | *(none -- referenced by plugins system)* |
| Documentation & audits | `docs/` | *(none -- internal reference)* |

### What Stays Local (Not Symlinked)

These are machine-specific, session-specific, or runtime data and must **not** be added to the repo:

- `cache/` — runtime cache
- `downloads/` — downloaded files
- `hooks/` — machine-specific hook scripts
- `plans/` — session-specific plan files
- `projects/` — per-project local overrides
- `settings.json` — machine-specific settings
- Other runtime directories and files

### The Rule

**Always create new skills, commands, and shared config inside `~/workspace/claudefiles/`.** Never write directly to `~/.claude/` for shared items — the symlinks ensure files written to `~/.claude/skills/`, `~/.claude/commands/`, etc. already land in the repo.

### Symlink Architecture

Only 4 symlinks are needed (the shared set is the minority):

```
~/.claude/CLAUDE.md          → ~/workspace/claudefiles/CLAUDE.md
~/.claude/commands/          → ~/workspace/claudefiles/commands/
~/.claude/skills/            → ~/workspace/claudefiles/skills/
~/.claude/settings.local.json → ~/workspace/claudefiles/settings.local.json
```

Everything else in `~/.claude/` is a real directory or file (17+ items). This is more efficient than the inverse approach (symlinking `~/.claude` itself to the repo and then symlinking each local item back out).

### Adding a New Shared Item

If a new top-level item needs to be shared (rare):

```bash
# 1. Move the item into the repo
mv ~/.claude/new-item ~/workspace/claudefiles/new-item

# 2. Create the symlink
ln -s ~/workspace/claudefiles/new-item ~/.claude/new-item

# 3. Commit
cd ~/workspace/claudefiles
git add new-item
git commit -m "Add new-item to shared config"
```

### Git Submodules

External tools and documentation are integrated as git submodules:

| Submodule | Path | Purpose |
|---|---|---|
| move-code-quality | `skills/move-code-quality/` | Move code quality checker skill |
| claudeception | `skills/claudeception/` | Continuous learning / skill extraction |
| sui-pilot | `sui-pilot/` | Sui/Walrus/Seal documentation copilot (500+ doc files) |

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

Agent role definitions and team recipes are documented in `~/workspace/claudefiles/AGENTS.md`. **Always consult this file when creating teams.**

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