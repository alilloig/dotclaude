---
name: git-submodule-add
description: |
  Adds a new git submodule following the user's preferred pattern: declares
  `branch = main` (or the upstream's actual default branch) and `update = merge`
  in `.gitmodules` so a single command (`git submodule update --init --recursive
  --remote --merge`) fast-forwards every submodule to the latest commit on its
  tracked branch — without leaving detached HEADs.

  Use this skill whenever:
  - The user says "add submodule", "declare a new submodule", "git submodule add ...",
    "añadir submódulo", "nuevo submódulo", or any variant.
  - The user asks to "convert" or "retrofit" an existing submodule to follow the pattern.
  - You are about to run `git submodule add` for any reason.
  - The user references this pattern by name (e.g., "the submodule pattern", "el patrón
    de submódulos") or asks why submodules are configured this way.

  Skip if the task is unrelated to declaring or modifying submodule entries
  (e.g., bumping pins, resolving conflicts).
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Adding a git submodule (the user's preferred pattern)

The user wants every submodule in their repos to declare its tracked branch and use merge-style updates so that a single command fast-forwards everything to the latest commit on `main` (or whichever branch the upstream uses) without detached HEAD or merge conflicts.

This skill enforces that pattern from the moment a submodule is declared.

## The pattern

A correctly-declared submodule entry in `.gitmodules` looks like:

```ini
[submodule "<path>"]
    path = <path>
    url = <url>
    branch = <upstream-default-branch>
    update = merge
```

The two non-default fields:
- **`branch = <name>`** — declares which branch counts as "latest". Required for `git submodule update --remote` to know what to fetch.
- **`update = merge`** — when `--remote` brings in a new tip, fast-forward the submodule's working tree (instead of leaving it detached). Reproducibility is preserved: parent repo still pins a SHA in its commit history.

The user has `submodule.recurse = true` in their `.gitconfig`, so `git pull/push/checkout/clone` already auto-recurse into submodules without flags.

## Workflow when adding a NEW submodule

1. **Detect the upstream's default branch.** Don't assume `main`:
   ```bash
   git ls-remote --symref <url> HEAD | head -1 | awk '{print $2}' | sed 's|refs/heads/||'
   ```
   Common values: `main`, `master`, `develop`. Use whatever this prints.

2. **Add the submodule with the `-b` flag.** This writes the `branch` field automatically:
   ```bash
   git submodule add -b <branch> <url> <path>
   ```

3. **Add `update = merge`** to the new entry in `.gitmodules` (use Edit tool — `git submodule add` does not write this field):
   ```ini
   [submodule "<path>"]
       path = <path>
       url = <url>
       branch = <branch>
       update = merge
   ```

4. **Verify** the configuration works:
   ```bash
   git submodule update --init --recursive --remote --merge
   ```
   Expect: the submodule's working tree at the tip of `<branch>`. No detached-HEAD warnings, no merge errors.

5. **Commit** `.gitmodules` and the submodule pin together:
   ```bash
   git add .gitmodules <path>
   git commit -m "feat: add <name> submodule"
   ```

## Workflow when CONVERTING an existing submodule

For each `[submodule "<path>"]` block in `.gitmodules` that lacks `branch` or `update`:

1. Detect its upstream default branch (step 1 above).
2. Add `branch = <branch>` and `update = merge` lines under the existing entry.
3. Verify with `git submodule update --init --recursive --remote --merge`.
4. Commit `.gitmodules` (and any submodule pin that bumped).

## Where this pattern is wired in the user's setup

- `~/workspace/dotfiles/.gitconfig` → `[submodule] recurse = true` (auto-recurse on pull/push/clone)
- `~/workspace/dotfiles/setup.sh` and `~/workspace/dotfiles/.claude/setup.sh` → run `submodule update --init --recursive --remote --merge` on fresh clones
- `~/workspace/dotfiles/bump-submodules.sh` → one-command "fast-forward all submodules to latest, show what bumped"

## Don't

- **Don't omit the `branch` field.** It's the foundation — `--remote` updates do nothing without it.
- **Don't hardcode `main`** when the upstream uses something else. Detect with `git ls-remote --symref`.
- **Don't use `update = rebase`** unless the user explicitly asks. `merge` is the safe default for fast-forwards.
- **Don't run `submodule add` without `-b`** then forget to add the `branch` field manually. The skill exists precisely to prevent that.

## Trade-off the user has accepted

After a fresh clone with `--remote --merge`, the working tree may be ahead of the SHA pinned in the parent repo (because the submodule's branch advanced since the last pin). `git status` will show `M <submodule-path>`. This is the intended signal: "the pinned SHA is stale, commit to bump it." The user will commit the new pin when they want it captured.
