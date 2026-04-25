# dotclaude

This repo **is** `~/.claude/`. It holds the entire Claude Code configuration — global `CLAUDE.md`, `settings.json`, skills, commands, plugins, hooks, and agent team recipes — and is consumed as a **git submodule** under [`alilloig/dotfiles`](https://github.com/alilloig/dotfiles) at `.claude/`. Ephemeral runtime data (sessions, caches, projects) lives on disk but is gitignored.

## Setup

### Recommended: via the `dotfiles` umbrella

```bash
git clone --recurse-submodules git@github.com:alilloig/dotfiles.git ~/workspace/dotfiles
cd ~/workspace/dotfiles && ./setup.sh
```

`dotfiles/setup.sh` will:

1. `git submodule update --init --recursive` (brings in `dotclaude` and its nested submodules).
2. Create the `~/.claude` → `~/workspace/dotfiles/.claude` symlink via its `backup_and_link` helper.
3. Invoke `~/.claude/setup.sh` to register plugin marketplaces, install plugins, and fix hook permissions.

### Standalone (without dotfiles)

```bash
git clone --recurse-submodules git@github.com:alilloig/dotclaude.git ~/workspace/dotclaude
ln -s ~/workspace/dotclaude ~/.claude
bash ~/.claude/setup.sh
```

## What's Tracked

| Category | Path |
|----------|------|
| Global instructions | `CLAUDE.md` |
| Skills | `skills/` |
| Commands | `commands/` |
| Global permissions | `settings.local.json` |
| User settings (hooks, plugins, env) | `settings.json` |
| Hook scripts | `hooks/` |
| `.remember/` skeleton (workaround for plugin bootstrap bug — see Hooks below) | `.remember/` |
| Agent teams | `teams/` |
| Local plugins | `plugins/codex-bridge/`, `plugins/sui-wallet/`, … |
| Plugin state | `plugins/*.json` |
| Agent catalog & recipes | `_meta/AGENTS.md` |
| Documentation & audits | `_meta/docs/` |
| Sui/Walrus/Seal docs (submodule) | `sui-pilot/` |

## What's Gitignored

Runtime/session data stays on disk but is never committed:

- `projects/` — per-project session data, memory, conversation logs
- `sessions/`, `session-env/`, `history.jsonl` — session tracking and history
- `cache/`, `debug/`, `telemetry/`, `statsig/` — caches and analytics
- `plugins/cache/`, `plugins/marketplaces/` — downloaded marketplace plugins
- `backups/`, `plans/`, `tasks/`, `todos/` — session-scoped working data

See `.gitignore` for the complete list.

## What's Inside

### Skills

#### Sui / Move / Blockchain

| Skill | Description |
|-------|-------------|
| `move-code-quality` | Analyzes Move packages against the Move Book Code Quality Checklist *(submodule)* |
| `move-code-review` | Security, architecture, and design review for Sui Move contracts *(submodule)* |
| `sui-marp-theme` | Applies Sui corporate theme to Marp slide markdown (20+ layout classes, product illustrations) |
| `sui-move-tip` | Concise Move/Sui feature summaries for sharing on Slack |
| `sui-2-migration-audit` | Audits TypeScript codebases for Sui SDK 2.0 migration completeness |
| `sui-balance-json-parsing` | Correct JSON structure and TypeScript parsing for Sui Balance fields |

#### General

| Skill | Description |
|-------|-------------|
| `game-design` | Creates mechanics-focused Game Design Documents through guided interaction |
| `pdf-visual-to-css-svg` | Translates visual design from PDFs into CSS themes and SVG assets |
| `technical-docs-to-learning-materials` | Transforms reference docs into structured educational content |
| `cli-documentation-verification` | Verifies CLI tool docs against the actual installed binary |
| `corpus-qa-skill-pattern` | Architectural pattern for building Q&A skills over large doc corpora |
| `for-dummies` | Generates plain-English intro guides by reading the actual codebase |
| `codex-bridge` | Integration between Claude Code and OpenAI Codex CLI via MCP |
| `marp-slide-content` | Turns source material into well-structured generic Marp slide markdown |
| `cli-agent-mcp-integration` | Pattern for integrating external CLI agents via MCP server mode |
| `git-submodule-add` | Adds a new git submodule with the user's preferred pattern (`branch = main` + `update = merge` so a single command fast-forwards every submodule to its declared branch tip) |

### Commands

| Command | Description |
|---------|-------------|
| `/codex` | Send a prompt to Codex CLI and return the response |
| `/generate-gh-templates` | Analyze a repo and create tailored GitHub issue and PR templates |

### Plugins

| Plugin | Path | Description |
|--------|------|-------------|
| codex-bridge | `plugins/codex-bridge/` | MCP bridge between Claude Code and OpenAI Codex CLI |
| sui-wallet | `plugins/sui-wallet/` | Sui wallet plugin |

### Hooks

A SessionStart hook in `settings.json` runs `mkdir -p "${CLAUDE_PROJECT_DIR:-.}/.remember/logs"` on every session.

Why: the `remember` plugin (v0.5.0) declares hook commands in `hooks.json` that end with `2>> .remember/logs/hook-errors.log`. The shell evaluates the redirect target *before* running the command, so on a fresh project where `.remember/logs/` does not exist the redirect fails with `No such file or directory` — even on the plugin's own SessionStart script that would otherwise create the dir. This user-settings hook has no redirect of its own (so it can't suffer the same bug) and pre-creates the dir before the plugin's hooks need it. The committed `.remember/` skeleton (see "What's Tracked") is a belt-and-suspenders companion that ensures the dir exists from the very first checkout of `.claude/` itself, with no `mkdir` race at all.

### Agent Roles & Team Recipes

Defined in [`_meta/AGENTS.md`](_meta/AGENTS.md). Reusable roles (`move-agent`, `frontend-agent`, `docs-agent`, `review-agent`, `event-services-agent`) and team recipes (`full-stack`, `contract-only`, `frontend-only`, `review`).

### Documentation Bridge

The `sui-pilot/` submodule provides 500+ doc files extracted from official sources:

| Directory | Docs | Topics |
|-----------|------|--------|
| `.sui-docs/` | 370 | Blockchain, Move language, objects, transactions, SDKs |
| `.walrus-docs/` | 125 | Decentralized storage, blobs, Walrus Sites, TypeScript SDK |
| `.seal-docs/` | 13 | Secrets management, encryption, key servers, access control |

## Adding New Items

**New skill**: create a directory under `skills/` with a `SKILL.md` and commit.

**New command**: add a `.md` file under `commands/` and commit.

**New config file**: just add it to the repo root and commit. If it's ephemeral/runtime, add it to `.gitignore` instead.

## Submodules

| Submodule | Path | Source |
|-----------|------|--------|
| move-code-quality | `skills/move-code-quality/` | [1NickPappas/move-code-quality-skill](https://github.com/1NickPappas/move-code-quality-skill) |
| move-code-review | `skills/move-code-review/` | [MystenLabs/move-code-review-skill](https://github.com/MystenLabs/move-code-review-skill) |
| sui-pilot | `sui-pilot/` | [alilloig/sui-pilot](https://github.com/alilloig/sui-pilot) |

Every submodule declares `branch = main` and `update = merge` in `.gitmodules` so `git submodule update --remote --merge` fast-forwards everything to the latest tip without detached HEAD. Combined with `submodule.recurse = true` in the user's `.gitconfig`, `git pull/push/checkout/clone` auto-recurse.

```bash
# Bump every submodule (parent + nested) to its declared branch tip
~/workspace/dotfiles/bump-submodules.sh

# Or, manually for one submodule:
git -C sui-pilot pull origin main && git add sui-pilot && git commit -m "Update sui-pilot submodule"
```

When adding a **new** submodule, invoke the `git-submodule-add` skill so the pattern is applied from the start.

> **Note on nesting**: when consumed via `dotfiles`, `dotclaude` itself is a submodule and the entries above become transitive submodules. `git clone --recurse-submodules` on `dotfiles` (or `git submodule update --init --recursive`) brings them all in.
