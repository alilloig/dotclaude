# claudefiles

Shared Claude Code configuration — skills, commands, plugins, agent definitions, and documentation — version-controlled and portable across machines.

## Setup

```bash
# Clone with submodules
git clone --recurse-submodules <repo-url> ~/workspace/claudefiles

# Create the 4 symlinks into ~/.claude/
ln -s ~/workspace/claudefiles/CLAUDE.md ~/.claude/CLAUDE.md
ln -s ~/workspace/claudefiles/commands/ ~/.claude/commands
ln -s ~/workspace/claudefiles/skills/ ~/.claude/skills
ln -s ~/workspace/claudefiles/settings.local.json ~/.claude/settings.local.json
```

Everything else in `~/.claude/` (cache, hooks, plans, projects, settings.json, etc.) stays local and is not symlinked.

## What's Inside

### Skills (19)

#### Sui / Move / Blockchain

| Skill | Description |
|-------|-------------|
| `move-code-quality` | Analyzes Move packages against the Move Book Code Quality Checklist *(submodule)* |
| `sui-marp-slide` | Creates Sui-branded Marp presentations with dark corporate theme |
| `sui-move-toml-migration` | Migrates Move.toml from pre-v1.63 to new package manager format |
| `sui-move-tip` | Concise Move/Sui feature summaries for sharing on Slack |
| `sui-2-migration-audit` | Audits TypeScript codebases for Sui SDK 2.0 migration completeness |
| `seal-owned-object-setsender` | Fix for Seal decryption failing on owned object sender mismatch |
| `sui-balance-json-parsing` | Correct JSON structure and TypeScript parsing for Sui Balance fields |
| `sui-vector-u8-base64-parsing` | Fix for silent failures parsing Move `vector<u8>` from gRPC/JSON-RPC |
| `sui-wallet-standard-v2-protocol` | Fix for custom wallets sending empty bytes with dApp Kit v2 |

#### General

| Skill | Description |
|-------|-------------|
| `game-design` | Creates mechanics-focused Game Design Documents through guided interaction |
| `claudeception` | Continuous learning system — extracts reusable skills from work sessions *(submodule)* |
| `pdf-visual-to-css-svg` | Translates visual design from PDFs into CSS themes and SVG assets |
| `technical-docs-to-learning-materials` | Transforms reference docs into structured educational content |
| `zsh-special-variable-clobbering` | Fix for zsh prompt disappearing after function execution |
| `cli-documentation-verification` | Verifies CLI tool docs against the actual installed binary |
| `corpus-qa-skill-pattern` | Architectural pattern for building Q&A skills over large doc corpora |
| `for-dummies` | Generates plain-English intro guides by reading the actual codebase |
| `codex-bridge` | Integration between Claude Code and OpenAI Codex CLI via MCP |
| `cli-agent-mcp-integration` | Pattern for integrating external CLI agents via MCP server mode |

### Commands (2)

| Command | Description |
|---------|-------------|
| `/codex` | Send a prompt to Codex CLI and return the response |
| `/generate-gh-templates` | Analyze a repo and create tailored GitHub issue and PR templates |

### Plugins (1)

| Plugin | Path | Description |
|--------|------|-------------|
| codex-bridge | `plugins/codex-bridge/` | MCP bridge between Claude Code and OpenAI Codex CLI |

### Agent Roles & Team Recipes

Defined in [`AGENTS.md`](AGENTS.md). Four reusable roles:

| Role | Model | Specialization |
|------|-------|----------------|
| `move-agent` | Opus | Sui Move contracts, tests, upgrades |
| `frontend-agent` | Opus | Next.js / React / dApp Kit frontend |
| `docs-agent` | Sonnet | Project documentation and guides |
| `review-agent` | Opus | Cross-stack code review and audits |

Four team recipes: `full-stack`, `contract-only`, `frontend-only`, `review`. See AGENTS.md for composition and task decomposition details.

### Documentation Bridge

The `sui-pilot/` submodule provides 500+ doc files extracted from official sources:

| Directory | Docs | Topics |
|-----------|------|--------|
| `.sui-docs/` | 370 | Blockchain, Move language, objects, transactions, SDKs |
| `.walrus-docs/` | 125 | Decentralized storage, blobs, Walrus Sites, TypeScript SDK |
| `.seal-docs/` | 13 | Secrets management, encryption, key servers, access control |

`CLAUDE.md` instructs Claude to consult these docs before any Sui/Move/Walrus/Seal work.

## Symlink Architecture

Only 4 symlinks connect this repo to `~/.claude/`:

```
~/.claude/CLAUDE.md           → ~/workspace/claudefiles/CLAUDE.md
~/.claude/commands/           → ~/workspace/claudefiles/commands/
~/.claude/skills/             → ~/workspace/claudefiles/skills/
~/.claude/settings.local.json → ~/workspace/claudefiles/settings.local.json
```

Everything else in `~/.claude/` is real (17+ local items). This is simpler than symlinking `~/.claude/` itself and then excluding local items back out.

## Adding New Items

**New skill**: create a directory under `skills/` with a `SKILL.md` — the symlink makes it immediately available.

**New command**: add a `.md` file under `commands/`.

**New shared top-level item** (rare):

```bash
mv ~/.claude/new-item ~/workspace/claudefiles/new-item
ln -s ~/workspace/claudefiles/new-item ~/.claude/new-item
```

## Submodules

| Submodule | Path | Source |
|-----------|------|--------|
| move-code-quality | `skills/move-code-quality/` | [1NickPappas/move-code-quality-skill](https://github.com/1NickPappas/move-code-quality-skill) |
| claudeception | `skills/claudeception/` | [blader/Claudeception](https://github.com/blader/Claudeception) |
| sui-pilot | `sui-pilot/` | [alilloig/sui-pilot](https://github.com/alilloig/sui-pilot) |

```bash
# Update a submodule to latest
cd sui-pilot && git pull origin main && cd ..
git add sui-pilot && git commit -m "Update sui-pilot submodule"
```
