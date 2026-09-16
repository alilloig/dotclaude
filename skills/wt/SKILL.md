---
name: wt
description: |
  Create a worktree of one project from ~/workspace INSIDE the current remote
  "bridge" worktree, so a single `claude rc` session started in ~/workspace can
  work on any inner repo (devfolio, vlerv, kaiosin, ...) on a fresh branch.

  Use whenever:
  - The user types `/wt`, `/wt <repo>`, `/wt <repo> <branch>`.
  - The user says "get me a worktree of X", "work on X here", "dame un worktree
    de X", "abre X en este worktree", or tries `cd <inner-repo>` from a bridge
    worktree and the folder is empty.
  - The session cwd is a `.claude/worktrees/bridge-*` checkout of the workspace
    repo and the user names a project that lives under ~/workspace.

  Skip when the cwd is already inside the target project's own checkout.
allowed-tools: Bash, AskUserQuestion
---

# wt — nested project worktree for bridge sessions

The workspace repo tracks only folder structure (`.gitignore` keeps `*/.gitkeep`
and ignores everything else), so a nested worktree inside the bridge checkout
is invisible to git and stays inside the session's allowed directory.

Script: `/Users/valrov/.claude/skills/wt/scripts/wt.sh` (always call it with the
absolute path — the worktree Bash guard rejects `~`).

## Steps

1. Run `bash /Users/valrov/.claude/skills/wt/scripts/wt.sh list` to get repos
   (paths relative to workspace).
2. Resolve the repo:
   - argument given → fuzzy-match it against the list (substring, case-insensitive);
     one hit → use it; several → `AskUserQuestion`.
   - no argument → `AskUserQuestion` with the list (max 4 options; put the most
     likely first, extra ones go in "Other").
3. Resolve the branch:
   - second argument given → use it verbatim.
   - otherwise `AskUserQuestion`: ask for a branch name, offer
     `wt/<short-topic>` style suggestions from the user's stated task if known.
   An existing local branch is checked out as-is; a new one is created from
   `origin/<default>`.
4. Run `bash /Users/valrov/.claude/skills/wt/scripts/wt.sh add <rel-repo> <branch>`.
5. `cd` into the printed path for the rest of the session and confirm in one
   line: path, branch, base. If the project has a CLAUDE.md, read it now.

## Cleanup

`/kthxbai` removes worktrees of merged/closed PRs. For a manual removal:
`git -C /Users/valrov/workspace/<rel-repo> worktree remove <abs-nested-path>`.
