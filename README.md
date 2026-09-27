# dotclaude

This repo **is** `~/.claude/`. It holds the entire Claude Code configuration — global `CLAUDE.md`, `settings.json`, skills, commands, plugins, hooks, and agent team recipes — and is consumed as a **git submodule** under [`alilloig/dotfiles`](https://github.com/alilloig/dotfiles) at `.claude/`. Ephemeral runtime data (sessions, caches, projects) lives on disk but is gitignored.

## Setup

### Recommended: via the `dotfiles` umbrella

```bash
git clone --recurse-submodules git@github.com:alilloig/dotfiles.git ~/workspace/dotfiles
cd ~/workspace/dotfiles && ./setup.sh
```

`dotfiles/setup.sh` will:

1. `git submodule update --init --recursive` (brings in `dotclaude`).
2. Create the `~/.claude` → `~/workspace/dotfiles/.claude` symlink via its `backup_and_link` helper.
3. Invoke `~/.claude/setup.sh` to register plugin marketplaces, install plugins, and fix hook permissions.

### Standalone (without dotfiles)

```bash
git clone git@github.com:alilloig/dotclaude.git ~/workspace/dotclaude
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
| Agent teams | `teams/` |
| Local plugins | `plugins/forge-bench/`, `plugins/sui-wallet/` |
| Plugin state | `plugins/installed_plugins.json`, `plugins/local/` |

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
| `sui-marp-theme` | Applies Sui corporate theme to Marp slide markdown (20+ layout classes, product illustrations) |
| `sui-move-tip` | Concise Move/Sui feature summaries for sharing on Slack |
| `sui-2-migration-audit` | Audits TypeScript codebases for Sui SDK 2.0 migration completeness |
| `sui-balance-json-parsing` | Correct JSON structure and TypeScript parsing for Sui Balance fields |
| `move-tests` | Move test authoring patterns |
| `deepbook-release` | DeepBook sandbox release-cycle workflow |
| `drive-slush-wallet` | Drives the Slush wallet extension during chrome-devtools-mcp dapp testing |
| `launch-dev-chrome` | Launches Chrome for Testing on :9222 with the wallet dev profile |

Move code-quality/code-review live in the **sui-pilot plugin** (contract-hero marketplace) as `/move-code-quality` and `/move-code-review` — no longer vendored here.

#### General

| Skill | Description |
|-------|-------------|
| `game-design` | Creates mechanics-focused Game Design Documents through guided interaction |
| `pdf-visual-to-css-svg` | Translates visual design from PDFs into CSS themes and SVG assets |
| `technical-docs-to-learning-materials` | Transforms reference docs into structured educational content |
| `cli-documentation-verification` | Verifies CLI tool docs against the actual installed binary |
| `corpus-qa-skill-pattern` | Architectural pattern for building Q&A skills over large doc corpora |
| `marp-slide-content` | Turns source material into well-structured generic Marp slide markdown |
| `lfg` | One-command ship + harden + review + adjudicate + merge + wrap-up pipeline for a PR |
| `stepped-pr` | Co-review a PR file-by-file with the user |
| `cli-agent-mcp-integration` | Pattern for integrating external CLI agents via MCP server mode |
| `git-submodule-add` | Adds a new git submodule with the user's preferred pattern (`branch = main` + `update = merge` so a single command fast-forwards every submodule to its declared branch tip) |

### Commands

| Command | Description |
|---------|-------------|
| `/codex` | Send a prompt to Codex CLI and return the response |
| `/generate-gh-templates` | Analyze a repo and create tailored GitHub issue and PR templates |

### Plugins

Local plugin sources (registered via the `plugins/local/` marketplace):

| Plugin | Path | Description |
|--------|------|-------------|
| forge-bench | `plugins/forge-bench/` | Benchmarking framework for comparing Code Forge variants |
| sui-wallet | `plugins/sui-wallet/` | Mock Sui wallet for browser-based dApp testing |

Everything else (sui-pilot, codex-bridge, code-forge, toolkit, the ACC courses, …) installs from the **contract-hero marketplace**; official Anthropic plugins from **claude-plugins-official**. `settings.json` `enabledPlugins` is the source of truth for what's active.

### Scripts

| Script | Description |
|--------|-------------|
| `scripts/setup-sol-sec-stack.sh` | Idempotent installer for the EVM / Solidity-security stack: Foundry, Slither, Aderyn, Halmos, Mythril, Medusa, Echidna, plus analysis-only MCP servers (Slither, OpenZeppelin, optional Etherscan) and the Pashov + Trail of Bits auditor skill repos (cloned to `skills-src/`, gitignored). Safe by design — never installs wallet/tx-signing MCPs. |
| `scripts/sol-sec-stack.sh` | Runtime **on/off/status** toggle for the EVM / Solidity-security stack. Flips all 39 `@trailofbits` plugins in `settings.json` and adds/removes the `openzeppelin` + `slither` MCP servers in `~/.claude.json` — in one command, no reinstall. |

### EVM / Solidity-security stack — two switches

The Solidity stack is **off by default** and governed by two complementary switches:

- **Bootstrap switch — `INSTALL_EVM_STACK=1`**: what `setup.sh` reads to decide
  whether to *install* the heavy toolchain (`setup-sol-sec-stack.sh`) **and** the
  39 Trail of Bits plugins. A plain `bash setup.sh` installs neither, so fresh
  machines stay lean.
- **Runtime switch — `scripts/sol-sec-stack.sh {on,off}`**: enables/disables the
  already-installed stack without reinstalling. `off` also strips the always-on
  hooks the plugins register (gh-cli Bash `PreToolUse`; fp-check/skill-improver
  `Stop`) and the bundled MCP servers, which are the main per-session cost.
  `settings.json` ships with all `@trailofbits` plugins disabled, so "off" is the
  committed default.

```bash
# Bootstrap (heavy toolchain + plugins)
INSTALL_EVM_STACK=1 bash setup.sh          # as part of a full bootstrap
bash ~/.claude/scripts/setup-sol-sec-stack.sh   # toolchain standalone, any time
bash ~/.claude/scripts/setup-sol-sec-stack.sh --check-only   # report only

# Runtime toggle (no reinstall) — restart Claude Code after flipping
~/.claude/scripts/sol-sec-stack.sh on      # enable plugins + MCP servers
~/.claude/scripts/sol-sec-stack.sh off     # disable everything
~/.claude/scripts/sol-sec-stack.sh status  # show current state
```

The pashov `solidity-auditor` / `x-ray` skills in `skills/` are left enabled by
either switch — they only load when explicitly invoked, so they cost nothing at rest.

Notes for a fresh machine: enable the cloned skills by symlinking the ones you want
into `skills/`, export `ETHERSCAN_API_KEY` before running to auto-register the
Etherscan MCP, and ensure `~/go/bin` is on `PATH` (dotfiles `.zshrc` adds it) so the
`medusa` binary is found.

### Hooks

One SessionStart hook in `settings.json` runs on every session:

- `hooks/patch-chrome-devtools-mcp.sh` — injects `--browser-url` into the chrome-devtools-mcp `plugin.json` so it attaches to the existing Chrome-for-Testing on :9222 instead of spawning a fresh one.

### Sui/Walrus/Seal Documentation

The 500+ bundled doc files (`.sui-docs/`, `.walrus-docs/`, `.seal-docs/`) ship inside the **sui-pilot plugin** installed from the contract-hero marketplace — nothing is vendored in this repo.

## Adding New Items

**New skill**: create a directory under `skills/` with a `SKILL.md` and commit.

**New command**: add a `.md` file under `commands/` and commit.

**New config file**: just add it to the repo root and commit. If it's ephemeral/runtime, add it to `.gitignore` instead.

## Submodules

This repo nests **no submodules** — plugins install from marketplaces (see above). `dotclaude` itself is consumed as a submodule of [`alilloig/dotfiles`](https://github.com/alilloig/dotfiles) at `.claude/`; `~/workspace/dotfiles/bump-submodules.sh` fast-forwards that pin.

If a submodule is ever added again, invoke the `git-submodule-add` skill so the `branch = main` + `update = merge` pattern is applied from the start.
