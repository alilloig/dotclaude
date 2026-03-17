#!/bin/bash
# Cutover: swap from 4-symlink setup to single ~/.claude symlink
# Run this AFTER closing all Claude Code sessions
set -euo pipefail

REPO_DIR="$HOME/workspace/claudefiles"
BACKUP_DIR="$HOME/.claude.bak"

echo "=== Claudefiles Cutover ==="
echo ""

# Safety checks
if [ -L "$HOME/.claude" ]; then
    echo "~/.claude is already a symlink → $(readlink "$HOME/.claude")"
    echo "Nothing to do."
    exit 0
fi

if [ ! -d "$HOME/.claude" ]; then
    echo "~/.claude does not exist. Run _meta/setup.sh instead."
    exit 1
fi

if [ -e "$BACKUP_DIR" ]; then
    echo "ERROR: $BACKUP_DIR already exists. Remove or rename it first."
    exit 1
fi

echo "Step 1: Remove old symlinks from ~/.claude/"
for item in CLAUDE.md commands skills settings.local.json; do
    if [ -L "$HOME/.claude/$item" ]; then
        echo "  Removing symlink: ~/.claude/$item"
        rm "$HOME/.claude/$item"
    fi
done

echo "Step 2: Move ~/.claude/ → $BACKUP_DIR"
mv "$HOME/.claude" "$BACKUP_DIR"

echo "Step 3: Create symlink ~/.claude → $REPO_DIR"
ln -s "$REPO_DIR" "$HOME/.claude"

echo "Step 4: Move ephemeral data back from backup"
EPHEMERAL_ITEMS=(
    backups cache debug downloads file-history history.jsonl
    ide mcp-needs-auth-cache.json paste-cache plans projects
    session-env sessions shell-snapshots stats-cache.json
    statsig tasks telemetry todos
)

for item in "${EPHEMERAL_ITEMS[@]}"; do
    if [ -e "$BACKUP_DIR/$item" ]; then
        echo "  Moving: $item"
        mv "$BACKUP_DIR/$item" "$HOME/.claude/$item"
    fi
done

# Move security_warnings_state files
for f in "$BACKUP_DIR"/security_warnings_state_*.json; do
    if [ -e "$f" ]; then
        echo "  Moving: $(basename "$f")"
        mv "$f" "$HOME/.claude/"
    fi
done

echo "Step 5: Move plugin runtime data"
for item in cache marketplaces install-counts-cache.json; do
    if [ -e "$BACKUP_DIR/plugins/$item" ]; then
        echo "  Moving: plugins/$item"
        mv "$BACKUP_DIR/plugins/$item" "$HOME/.claude/plugins/$item"
    fi
done

echo ""
echo "=== Cutover complete ==="
echo ""
echo "Verify: ls -la ~/.claude"
ls -la "$HOME/.claude" | head -3
echo ""
echo "Git status (should be clean):"
cd "$REPO_DIR" && git status --short
echo ""
echo "Backup is at: $BACKUP_DIR"
echo "Once verified, remove it: rm -rf $BACKUP_DIR"
