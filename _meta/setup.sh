#!/bin/bash
# Bootstrap claudefiles: create the ~/.claude symlink
# Run on a new machine after cloning the repo
#
# Also fixes plugin hook permissions (can be re-run any time after plugin updates).
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Ensure all .sh scripts in the plugin cache have execute permission.
# Some plugins ship hook scripts without +x, which causes SessionStart
# (or other hook events) to fail with "permission denied" at runtime.
# This also recurs after plugin updates since new versions are fresh checkouts.
fix_plugin_hook_permissions() {
    local cache_dir="$REPO_DIR/plugins/cache"
    [ -d "$cache_dir" ] || return 0
    local count=0
    while IFS= read -r -d '' f; do
        chmod +x "$f"
        count=$((count + 1))
    done < <(find "$cache_dir" -name "*.sh" ! -perm -u+x -print0 2>/dev/null)
    [ "$count" -gt 0 ] && echo "Fixed execute permission on $count plugin script(s)"
    return 0
}

# Allow running just the permission fix: setup.sh --fix-permissions
if [ "${1:-}" = "--fix-permissions" ]; then
    fix_plugin_hook_permissions
    exit 0
fi

if [ -d "$HOME/.claude" ] && [ ! -L "$HOME/.claude" ]; then
    echo "ERROR: ~/.claude/ exists and is a real directory."
    echo ""
    echo "To migrate from an existing setup:"
    echo "  1. mv ~/.claude ~/.claude.bak"
    echo "  2. Re-run this script"
    echo "  3. Move ephemeral data back: see README.md migration steps"
    exit 1
fi

if [ -L "$HOME/.claude" ]; then
    target="$(readlink "$HOME/.claude")"
    if [ "$target" = "$REPO_DIR" ]; then
        echo "Already set up: ~/.claude → $REPO_DIR"
    else
        echo "ERROR: ~/.claude is a symlink to $target (expected $REPO_DIR)"
        echo "Remove it first: rm ~/.claude"
        exit 1
    fi
else
    ln -s "$REPO_DIR" "$HOME/.claude"
    echo "Created: ~/.claude → $REPO_DIR"
    echo ""
    echo "Claude Code will create ephemeral directories (projects/, sessions/, etc.)"
    echo "on first run. These are gitignored automatically."
fi

# Always fix plugin hook permissions
fix_plugin_hook_permissions
