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

# --- 2. Git submodules ---
echo ""
echo "--- Submodules ---"
git -C "$REPO_DIR" submodule update --init --recursive --remote --merge
echo "✓ Submodules initialized + fast-forwarded to declared branches"

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
    chrome-devtools-mcp claude-code-setup claude-md-management
    code-review code-simplifier commit-commands feature-dev
    frontend-design github gopls-lsp hookify
    learning-output-style legalzoom linear mcp-server-dev
    notion playground playwright plugin-dev pr-review-toolkit
    pyright-lsp ralph-loop remember rust-analyzer-lsp
    security-guidance skill-creator slack superpowers
    swift-lsp telegram typescript-lsp
)
for p in "${official_plugins[@]}"; do
    install_plugin "${p}@claude-plugins-official"
done

# Impeccable marketplace
install_plugin "impeccable@impeccable"

# Local plugins
for p in code-forge code-forge-rig codex-bridge forge-bench sui-wallet; do
    install_plugin "${p}@local"
done

echo ""
echo "  Installed: $installed  Already present: $skipped"

# --- 5. Disable selected plugins ---
echo ""
echo "--- Disable optional plugins ---"
disabled_plugins=(
    github@claude-plugins-official
    linear@claude-plugins-official
    playwright@claude-plugins-official
    slack@claude-plugins-official
    notion@claude-plugins-official
)
for p in "${disabled_plugins[@]}"; do
    claude plugin disable "$p" 2>/dev/null || true
done
echo "  ✓ Disabled: github, linear, playwright, slack, notion"

# --- Done ---
echo ""
echo "=== Setup complete ==="
echo ""
echo "Restart Claude Code to load all plugins."
echo "Verify with: claude plugin list"
