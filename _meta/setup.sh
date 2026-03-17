#!/bin/bash
# Bootstrap claudefiles: create the ~/.claude symlink
# Run on a new machine after cloning the repo
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

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
        exit 0
    else
        echo "ERROR: ~/.claude is a symlink to $target (expected $REPO_DIR)"
        echo "Remove it first: rm ~/.claude"
        exit 1
    fi
fi

ln -s "$REPO_DIR" "$HOME/.claude"
echo "Created: ~/.claude → $REPO_DIR"
echo ""
echo "Claude Code will create ephemeral directories (projects/, sessions/, etc.)"
echo "on first run. These are gitignored automatically."
