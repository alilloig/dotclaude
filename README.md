# claudefiles

This repo **is** `~/.claude/`. One symlink makes the entire Claude Code config directory version-controlled and portable across machines. Ephemeral runtime data (sessions, caches, projects) lives on disk but is gitignored.

## Setup

```bash
# Clone with submodules
git clone --recurse-submodules git@github.com:alilloig/claudefiles.git ~/workspace/claudefiles

# Create the single symlink
ln -s ~/workspace/claudefiles ~/.claude
```

Or use the bootstrap script:

```bash
bash ~/workspace/claudefiles/_meta/setup.sh
```

### Migrating from the old 4-symlink setup

```bash
# Remove the 4 old symlinks
rm ~/.claude/CLAUDE.md ~/.claude/commands ~/.claude/skills ~/.claude/settings.local.json

# Move ~/.claude aside (preserves ephemeral data)
mv ~/.claude ~/.claude.bak

# Create the single symlink
ln -s ~/workspace/claudefiles ~/.claude

# Move ephemeral content back (gitignored, won't be committed)
for item in backups cache debug downloads file-history history.jsonl \
  ide mcp-needs-auth-cache.json paste-cache plans projects \
  session-env sessions shell-snapshots stats-cache.json \
  statsig tasks telemetry todos; do
    [ -e ~/.claude.bak/$item ] && mv ~/.claude.bak/$item ~/.claude/$item
done
mv ~/.claude.bak/security_warnings_state_*.json ~/.claude/ 2>/dev/null
mv ~/.claude.bak/plugins/cache ~/.claude/plugins/cache
mv ~/.claude.bak/plugins/marketplaces ~/.claude/plugins/marketplaces
mv ~/.claude.bak/plugins/install-counts-cache.json ~/.claude/plugins/ 2>/dev/null

# Verify, then clean up
ls -la ~/.claude  # should show symlink
rm -rf ~/.claude.bak
```

## What's Tracked

| Category | Path |
|----------|------|
| Global instructions | `CLAUDE.md` |
| Skills (15) | `skills/` |
| Commands (2) | `commands/` |
| Global permissions | `settings.local.json` |
| User settings (hooks, plugins, env) | `settings.json` |
| Hook scripts | `hooks/` |
| Agent teams | `teams/` |
| Local plugins | `plugins/codex-bridge/`, `plugins/sui-wallet/` |
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

### Skills (15)

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

### Commands (2)

| Command | Description |
|---------|-------------|
| `/codex` | Send a prompt to Codex CLI and return the response |
| `/generate-gh-templates` | Analyze a repo and create tailored GitHub issue and PR templates |

### Plugins (2)

| Plugin | Path | Description |
|--------|------|-------------|
| codex-bridge | `plugins/codex-bridge/` | MCP bridge between Claude Code and OpenAI Codex CLI |
| sui-wallet | `plugins/sui-wallet/` | Sui wallet plugin |

### Agent Roles & Team Recipes

Defined in [`_meta/AGENTS.md`](_meta/AGENTS.md). Four reusable roles:

| Role | Model | Specialization |
|------|-------|----------------|
| `move-agent` | Opus | Sui Move contracts, tests, upgrades |
| `frontend-agent` | Opus | Next.js / React / dApp Kit frontend |
| `docs-agent` | Sonnet | Project documentation and guides |
| `review-agent` | Opus | Cross-stack code review and audits |

Four team recipes: `full-stack`, `contract-only`, `frontend-only`, `review`. See `_meta/AGENTS.md` for details.

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

```bash
# Update a submodule to latest
cd sui-pilot && git pull origin main && cd ..
git add sui-pilot && git commit -m "Update sui-pilot submodule"
```
