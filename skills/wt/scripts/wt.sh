#!/usr/bin/env bash
# wt.sh — create a worktree of a workspace project INSIDE the current bridge worktree.
#
#   wt.sh list                       # print candidate repos (relative to workspace)
#   wt.sh add <rel-repo> <branch>    # create $PWD/<rel-repo> as a worktree of <branch>
#
# <rel-repo> is relative to $WORKSPACE (default /Users/valrov/workspace),
# e.g. devfolio/contract-hero-devfolio or vlerv.
set -euo pipefail

WORKSPACE="${WORKSPACE:-/Users/valrov/workspace}"; WORKSPACE="${WORKSPACE%/}"
cmd="${1:-list}"

case "$cmd" in
  list)
    # depth 1 and 2 git repos, skip the workspace repo itself and its .claude worktrees
    find "$WORKSPACE" -mindepth 2 -maxdepth 3 -name .git -not -path "$WORKSPACE/.claude/*" -not -path "*/*-worktrees/*" 2>/dev/null \
      | sed -e 's#/\.git$##' -e "s#^$WORKSPACE/##" | sort
    ;;
  add)
    rel="${2:?rel-repo required}"; branch="${3:?branch required}"
    src="$WORKSPACE/$rel"
    dst="$PWD/$rel"
    [ -d "$src/.git" ] || [ -f "$src/.git" ] || { echo "not a repo: $src" >&2; exit 1; }
    [ -e "$dst/.git" ] && { echo "already a worktree: $dst"; exit 0; }
    mkdir -p "$(dirname "$dst")"
    default="$(git -C "$src" symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##' || echo main)"
    git -C "$src" fetch origin "$default" --quiet || true
    if git -C "$src" show-ref --verify --quiet "refs/heads/$branch"; then
      git -C "$src" worktree add "$dst" "$branch"
    else
      git -C "$src" worktree add -b "$branch" "$dst" "origin/$default"
    fi
    echo "worktree ready: $dst (branch $branch, base origin/$default)"
    ;;
  *) echo "usage: wt.sh list | add <rel-repo> <branch>" >&2; exit 2;;
esac
