#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== dotclaude setup ==="
echo "Repo: $REPO_DIR"
echo ""

# --- Prerequisites ---
if ! command -v claude &>/dev/null; then
    echo "✘ 'claude' CLI not found. Install Claude Code first:"
    echo "  npm install -g @anthropic-ai/claude-code"
    exit 1
fi

# --- 1. Symlink ~/.claude -> repo ---
if [ -L "$HOME/.claude" ]; then
    current=$(readlink "$HOME/.claude")
    if [ "$current" = "$REPO_DIR" ]; then
        echo "✓ ~/.claude -> $REPO_DIR"
    else
        echo "! ~/.claude -> $current (expected $REPO_DIR)"
        echo "  Remove the symlink and re-run to update."
        exit 1
    fi
elif [ -e "$HOME/.claude" ]; then
    echo "! ~/.claude exists but is not a symlink."
    echo "  Back it up and remove it, then re-run:"
    echo "    mv ~/.claude ~/.claude.bak && bash $0"
    exit 1
else
    ln -s "$REPO_DIR" "$HOME/.claude"
    echo "✓ Created ~/.claude -> $REPO_DIR"
fi

# --- 1b. Machine-local plugin state ---
# enabledPlugins in settings.json is machine-local by policy (see CLAUDE.md).
# skip-worktree hides local changes to settings.json from git, so plugin
# enables/disables never sync between machines. To commit an intentional
# settings.json change, lift the flag with --no-skip-worktree, commit, re-set.
# Note: Claude Code ignores enabledPlugins in a user-level settings.local.json.
if git -C "$REPO_DIR" rev-parse --is-inside-work-tree &>/dev/null; then
    git -C "$REPO_DIR" update-index --skip-worktree settings.json
    echo "✓ settings.json marked skip-worktree (machine-local plugin state)"
fi

# --- 1c. Baseline plugins ---
# Plugins that every machine gets. Enable state stays machine-local (1b), so
# this list is the only tracked record. Re-running is safe: add/install are
# idempotent and a failure only warns.
echo ""
echo "--- Baseline plugins ---"
add_marketplace() {
    if claude plugin marketplace add "$1" &>/dev/null; then
        echo "✓ marketplace $1"
    else
        echo "! marketplace $1 could not be added"
    fi
}
add_plugin() {
    if claude plugin install "$1" --scope user &>/dev/null; then
        echo "✓ plugin $1"
    else
        echo "! plugin $1 could not be installed"
    fi
}

add_marketplace "mattpocock/skills"
add_plugin "mattpocock-skills@mattpocock"

# --- 2. Plugin hook permissions ---
# Some plugins ship hook scripts without +x, which makes SessionStart (or other
# hook events) fail with "permission denied". Recurs after plugin updates since
# new versions are fresh checkouts — safe to re-run any time.
echo ""
echo "--- Plugin hook permissions ---"
if [ -d "$REPO_DIR/plugins/cache" ]; then
    count=0
    while IFS= read -r -d '' f; do
        chmod +x "$f"
        count=$((count + 1))
    done < <(find "$REPO_DIR/plugins/cache" -name '*.sh' ! -perm -u+x -print0)
    echo "✓ Made $count plugin hook script(s) executable"
else
    echo "· no plugin cache yet (first run)"
fi

# --- 3. Marketplaces ---
echo ""
echo "--- Marketplaces ---"

# Local marketplace (re-registers with correct absolute path for this machine)
if claude plugin marketplace add "$REPO_DIR/plugins/local" 2>/dev/null; then
    echo "✓ local marketplace registered"
else
    echo "· local marketplace (already registered)"
fi

# Fetch/refresh all marketplace catalogs (official, impeccable, local)
# Official and impeccable are declared in settings.json extraKnownMarketplaces
echo "  Updating catalogs..."
claude plugin marketplace update 2>/dev/null || true

# --- 4. Install plugins ---
echo ""
echo "--- Plugins ---"

installed=0
skipped=0

install_plugin() {
    if claude plugin install "$1" 2>/dev/null; then
        echo "  ✓ $1"
        ((installed++)) || true
    else
        ((skipped++)) || true
    fi
}

# Official marketplace
official_plugins=(
    agent-sdk-dev chrome-devtools-mcp claude-code-setup
    claude-md-management claude-security
    code-review code-simplifier commit-commands
    explanatory-output-style feature-dev figma
    frontend-design github hookify
    learning-output-style linear math-olympiad
    mattpocock-skills mcp-server-dev
    notion pagerduty playground plugin-dev
    pr-review-toolkit project-artifact
    pyright-lsp receipts rust-analyzer-lsp
    security-guidance sentry session-report
    skill-creator slack typescript-lsp
)
for p in "${official_plugins[@]}"; do
    install_plugin "${p}@claude-plugins-official"
done

# Local plugins
local_plugins=(forge-bench sui-wallet)
for p in "${local_plugins[@]}"; do
    install_plugin "${p}@local"
done

# Contract-hero plugins (code-forge + codex-bridge migrated here from local;
# see plugins/marketplaces/contract-hero/.claude-plugin/marketplace.json)
ch_plugins=(code-forge codex-bridge sui-agent-tank sui-pilot toolkit)
for p in "${ch_plugins[@]}"; do
    install_plugin "${p}@contract-hero"
done

# Other marketplaces (declared in settings.json extraKnownMarketplaces)
other_plugins=(
    impeccable@impeccable
    codex@openai-codex
    scroll-world@scroll-world
    cloudflare@cloudflare
)
for p in "${other_plugins[@]}"; do
    install_plugin "$p"
done

# Trail of Bits security plugins (marketplace: trailofbits/skills, declared in
# settings.json extraKnownMarketplaces). Full set — AI-assisted security
# analysis, fuzzing, static analysis, audit workflows, etc.
#
# Gated behind INSTALL_EVM_STACK (same flag as the heavy toolchain below) so a
# default bootstrap stays lean. These 39 plugins register always-on hooks
# (gh-cli Bash PreToolUse; fp-check/skill-improver Stop) and pull in extra MCP
# servers, so they're opt-in. settings.json ships them disabled; the runtime
# switch is scripts/sol-sec-stack.sh {on,off}.
tob_plugins=(
    ask-questions-if-underspecified audit-context-building
    building-secure-contracts burpsuite-project-parser
    claude-in-chrome-troubleshooting constant-time-analysis culture-index
    debug-buttercup devcontainer-setup differential-review
    firebase-apk-scanner gh-cli dwarf-expert entry-point-analyzer
    mutation-testing property-based-testing semgrep-rule-creator
    semgrep-rule-variant-creator sharp-edges static-analysis
    spec-to-code-compliance testing-handbook-skills trailmark
    variant-analysis c-review modern-python insecure-defaults
    second-opinion yara-authoring git-cleanup workflow-skill-design
    seatbelt-sandboxer supply-chain-risk-auditor zeroize-audit
    let-fate-decide agentic-actions-auditor skill-improver fp-check
    dimensional-analysis
)
if [ "${INSTALL_EVM_STACK:-0}" = "1" ]; then
    for p in "${tob_plugins[@]}"; do
        install_plugin "${p}@trailofbits"
    done
else
    echo "  · Trail of Bits plugins skipped (set INSTALL_EVM_STACK=1 to install)"
    echo "    runtime toggle: ~/.claude/scripts/sol-sec-stack.sh on"
fi

echo ""
echo "  Installed: $installed  Already present: $skipped"

# --- 5. Disable selected plugins ---
echo ""
echo "--- Disable optional plugins ---"
disabled_plugins=(
    slack@claude-plugins-official
    notion@claude-plugins-official
)
for p in "${disabled_plugins[@]}"; do
    claude plugin disable "$p" 2>/dev/null || true
done
echo "  ✓ Disabled: slack, notion"

# --- 6. Drift check (registry vs this script) ---
# plugins/installed_plugins.json is gitignored (machine-derived state), so git
# status no longer flags ad-hoc `/plugin install`s. This check replaces that
# tripwire: it lists plugins present in the local registry that this script
# does not declare, so the declared set stays the single source of truth.
echo ""
echo "--- Drift check (installed vs declared) ---"
registry="$REPO_DIR/plugins/installed_plugins.json"
if [ ! -f "$registry" ]; then
    echo "  · no plugin registry yet (first run)"
elif ! command -v python3 &>/dev/null; then
    echo "  · python3 not found, skipping"
else
    declared=(
        "${official_plugins[@]/%/@claude-plugins-official}"
        "${local_plugins[@]/%/@local}"
        "${ch_plugins[@]/%/@contract-hero}"
        "${tob_plugins[@]/%/@trailofbits}"
        "${other_plugins[@]}"
    )
    drift=$(python3 - "$registry" "${declared[@]}" <<'PY'
import json, sys
installed = set(json.load(open(sys.argv[1]))["plugins"])
for name in sorted(installed - set(sys.argv[2:])):
    print(f"  ! {name}")
PY
    )
    if [ -n "$drift" ]; then
        echo "  Installed on this machine but not declared in setup.sh:"
        echo "$drift"
        echo "  -> add them here (or uninstall) to keep bootstrap reproducible"
    else
        echo "  ✓ no drift"
    fi
fi

# --- 7. EVM / Solidity-security stack (opt-in) ---
# Heavy toolchain (Foundry, Slither, Aderyn, Halmos, Mythril, Medusa, Echidna)
# plus analysis-only MCP servers and auditor skill repos. Off by default so
# normal bootstraps stay fast; enable with:
#     INSTALL_EVM_STACK=1 bash setup.sh
# The installer is idempotent and safe to re-run.
echo ""
echo "--- EVM / Solidity-security stack ---"
if [ "${INSTALL_EVM_STACK:-0}" = "1" ]; then
    echo "  INSTALL_EVM_STACK=1 -> running scripts/setup-sol-sec-stack.sh --yes"
    bash "$REPO_DIR/scripts/setup-sol-sec-stack.sh" --yes || \
        echo "  ! EVM stack install reported issues (see output above)"
else
    echo "  · skipped (set INSTALL_EVM_STACK=1 to install)"
    echo "    or run manually: bash ~/.claude/scripts/setup-sol-sec-stack.sh"
fi

# --- Done ---
echo ""
echo "=== Setup complete ==="
echo ""
echo "Restart Claude Code to load all plugins."
echo "Verify with: claude plugin list"
