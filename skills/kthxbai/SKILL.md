---
name: kthxbai
description: |
  End-of-session wrap-up pipeline. Persists any context worth keeping into
  memories, a per-project checkpoint, and handoff artifacts; sweeps stale
  memories out of the always-loaded index; deletes the branch and worktree of a
  PR that is already merged or closed; and — when the session touched a Claude
  Code plugin — reinstalls it, purges the stale cache, and refreshes the
  marketplace.

  Use this skill whenever:
  - The user types `/kthxbai`, or says "kthxbai", "kthx bai", "k thx bai".
  - The user signals the session is over: "done for today", "that's it for
    today", "wrap up", "wrap this session", "close out", "I'm done", "shutting
    down", "let's call it", "end of session".
  - Spanish variants: "me voy", "lo dejo por hoy", "cerramos", "hasta mañana",
    "ya está por hoy", "cierra la sesión".
  - The user asks to "save what we learned", "persist the context", "clean up
    the worktree", or "clean up before I go".

  Trigger it even when the user only hints at leaving — the cost of running the
  survey and finding nothing to do is small, and the cost of losing a session's
  context is not.

  Skip when the user wants a single isolated action that this skill happens to
  contain (just committing, just writing one memory, just deleting one branch).
  Those are cheaper done directly.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
---

# kthxbai — end-of-session wrap-up

Sessions end at a bad moment more often than a good one. What is expensive to
lose is not the code — that is in git — but everything **around** it: the reason
a design was rejected, the constraint discovered halfway through, the next step
that was obvious in the moment and gone by tomorrow.

This skill closes a session in four phases. Each phase is independent: a phase
that cannot run reports why and the pipeline continues. Never abandon the whole
wrap-up because one phase is blocked — the memory capture is the part that
cannot be recovered later.

---

## Phase 0 — Survey

Gather state before changing anything. Run these together and read the results
before you decide what the session was about:

```bash
git rev-parse --show-toplevel 2>/dev/null
git branch --show-current
git status --porcelain
git worktree list --porcelain | sed -n 's/^worktree //p'
git log --oneline -15
```

Then answer four questions for yourself:

1. **Which project is this?** The repo toplevel, plus whatever the session
   actually worked on. A session under `~/workspace` can touch several projects.
2. **Am I in a linked worktree or the main checkout?** This decides Phase 2:
   ```bash
   [ "$(git rev-parse --git-dir)" = "$(git rev-parse --show-toplevel)/.git" ] \
     && echo main-checkout || echo linked-worktree
   ```
3. **Is there a PR for this branch, and what state is it in?**
   ```bash
   gh pr view --json number,state,url,mergedAt,headRefName 2>/dev/null
   ```
   `state` is `MERGED`, `CLOSED`, or `OPEN`. No PR at all is a valid answer.
4. **Did this session touch a Claude Code plugin?** See Phase 3's detection.

Uncommitted changes are a signal, not an error. Report them in the final
summary so the user decides — do not commit on their behalf, and do not let
them block the other phases.

---
## Phase 1 — Persist what is not written down yet

This is the phase that justifies the skill. Run it first and run it always.

The memory store has two costs, and they are not the same. `MEMORY.md` loads
into **every** session, so each line there is a permanent tax. Individual memory
files load selectively, so their cost is retrieval precision. A policy that only
asks "is this worth writing?" prices the second cost and ignores the first —
which is how a memory store degrades into an always-loaded wall of stale hints.
So this phase both writes and evicts.

### Step 1 — Establish the baseline

```bash
cat ~/.claude/projects/-Users-valrov-workspace/memory/MEMORY.md
ls ~/.claude/projects/-Users-valrov-workspace/memory/
git log --oneline -15
```

Something is already saved if it lives in a commit message, a PR description, a
design doc, a `CLAUDE.md`, or an existing memory file.

### Step 2 — The filter

For each candidate fact, four questions. It needs all four:

1. **Will it be reused?** Beyond the conversation that just ended.
2. **Is it expensive or unreliable to recover?** Note that "the repo technically
   contains enough to rederive this" is *not* a reason to drop it. A fact that
   takes two hours and three failed builds to reconstruct is worth recording
   even though every ingredient is on disk.
3. **Is there no better home?** — the **placement test**, and the one most
   often skipped. If it belongs in the repo's documentation, in a test, in a
   script, or in an issue, then memory is the wrong permanent home. Durable
   project knowledge parked in private memory is documentation debt. Record a
   pointer to that debt if you must, not the knowledge itself.
4. **Can you state when it stops being true?** If not, see Step 4.

### Step 3 — Sort the candidate into one of three homes

The distinction that matters most is **durable fact** against **working state**.
Conflating them is what makes a memory store dangerous: a stale "next step" gets
recalled weeks later and the agent confidently restarts work that already
shipped.

| Home | Holds | Lifetime |
|---|---|---|
| **Durable memory** | decisions, constraints, preferences, diagnostics, pointers | until invalidated |
| **Project checkpoint** | current state and next action, one per project | replaced every session |
| **Handoff artifact** | an unfinished thread with real structure | until the thread closes |

What earns a durable memory:

- **A decision and the option it beat.** The code shows what was chosen, not
  what was rejected or why. Keep the exception or caveat in the *same file* as
  the decision — selective recall can load "use approach A" and miss a linked
  file holding the condition under which A is wrong.
- **A constraint discovered by hitting it**, with the version and environment
  that made it true.
- **Expensive diagnostic or operational knowledge**: a minimal reproduction, a
  known-good command sequence, an experiment that failed and should not be
  repeated, the evidence that separated two plausible root causes.
- **A correction the user made to how you work** — but check whether it was
  situational before generalizing it. "Don't refactor this" said during a
  minimal hotfix is not a standing ban on refactoring.
- **A fact about another project** that surfaced here. File it under that
  project's scope; adjacency to this session is accidental and not a reason to
  treat it as authoritative anywhere.

### Step 4 — Write the durable memory

Everything goes in `~/.claude/projects/-Users-valrov-workspace/memory/`, even
for a session run inside a subproject. The per-subproject memory directories
exist but are empty by design — a memory filed under
`-Users-valrov-workspace-kaiosin/` will not load when the user works from
`~/workspace`, which is where they usually work.

```markdown
---
name: <short-kebab-case-slug>
description: <one line — what future-you reads to decide relevance>
metadata:
  type: user | feedback | project | reference
---

<the fact. For feedback/project, add **Why:** and **How to apply:** lines.
Link related memories with [[their-slug]].>
```

Keep to these four types. They are defined by the memory system that reads
these files, so a record written in a richer shape is a record that does not
load.

**Give every mutable claim a validity boundary** in the body. Frontmatter is
fixed, so write it as two plain lines:

```markdown
**True as of:** 2026-09-08, sui CLI 1.64.2 on macOS ARM
**Recheck when:** the CLI is upgraded, or issue #123 closes
```

Prefer an invalidating *event* over a date. "When the dependency is upgraded" is
checkable; "after 90 days" only tells you to worry. Without this line, a
temporary bug becomes permanent folklore and the agent designs around a defect
that was fixed months ago.

Convert relative dates to absolute ones. **Update an existing memory before
creating a new one** — two memories that half-agree are worse than one current
one.

Then add one line to `MEMORY.md`: `- [Title](file.md) — hook`. Write the hook
so it cannot mislead on its own. A hook is loaded every session even when the
file is never recalled, so a bare "Sui CLI does not support X" biases behavior
for as long as it sits there. If the claim is version-bound, say so in the hook.

### Step 5 — Replace the project checkpoint

**At most one checkpoint per project, replaced in place, never accumulated.**
This is the mechanism that keeps "next step" useful without letting it rot.

Use `type: project`, name it `<project>-checkpoint`, and overwrite the previous
one. The body:

```markdown
**Goal:** <what this work is for>
**State:** <where it actually stands>
**Next action:** <enough to start cold>
**Blocked on:** <question or dependency, or "nothing">
**Verify first:** <what must be true before acting on this>
**Based on:** <branch>@<short-sha>, PR #<n>
**True as of:** <absolute date>
```

`Based on` and `Verify first` are what make the checkpoint safe to act on: a
later session can compare against current `HEAD` and PR state and see for itself
whether the next action already happened. Delete the checkpoint when the work
finishes — a completed checkpoint is the single most dangerous record in the
store.

### Step 6 — Sweep before you leave

The store is small enough that reading every file's frontmatter costs almost
nothing, and this is the only moment anyone will do it. For each indexed record:

- **Delete** checkpoints whose work has landed.
- **Delete** records whose invalidating event has occurred.
- **Update** records their authoritative source now contradicts.
- **Merge** records with the same scope and recall cue.
- **Fix** any hook in `MEMORY.md` that reads as timeless but is not.

Hold `MEMORY.md` to a soft budget of roughly 500–800 tokens. Past that, adding a
memory has to replace, merge, or evict something — **append-forever is not an
allowed operation**. Do not leave tombstones: a deleted memory's index line goes
too, since the line is the part that was costing context.

Report deletions in Phase 4. The user should hear what you removed, not
discover it missing.

### Handoff artifacts

A memory holds a fact; a checkpoint holds a position. Work with real structure
needs more room than either: a multi-step plan partly done, a review with
findings not yet addressed, an investigation with a live hypothesis.

Follow the user's deliverable rule — a handoff meant for reading is
self-contained HTML, not markdown. Point at it from the project checkpoint so
the next session finds it, and end the turn with its `vlerv://open?path=…`
deep-link.

If the session produced no unfinished thread, skip this. An artifact written for
the sake of the checklist is noise.

---

## Phase 2 — Retire the branch and the worktree

Only for work whose PR has landed. An open PR still needs its branch.

### The gate

Read `state` from the Phase 0 `gh pr view` call:

- **`MERGED` or `CLOSED`** → proceed.
- **`OPEN`** → **refuse this phase.** Do not delete, do not ask to override.
  Report `branch + worktree kept — PR #N is still open` and move to Phase 3.
  The rest of the wrap-up still runs; only this phase stops.
- **No PR found** → also refuse, and say so. A branch with no PR may be
  unpushed work. Deleting it is unrecoverable, and the user did not ask for it.

The asymmetry is deliberate: keeping a branch too long costs nothing, and
deleting one too early can cost work that exists nowhere else.

### The removal order

Order matters here — most failures in this phase come from getting it wrong.

1. **Leave the worktree before removing it.** You cannot delete the directory
   you are standing in. Move to the main checkout first, using the path from
   `git worktree list` whose `.git` is a real directory. If the `ExitWorktree`
   tool is available, prefer it.

2. **Confirm the worktree is clean.** `git -C "$WT" status --porcelain` must be
   empty. Untracked files here are the usual surprise — run artifacts, notes,
   a scratch directory. If anything shows up, stop and show it to the user.
   `--force` exists but throwing away unreviewed files is not this skill's call.

3. **Remove the worktree, then prune:**
   ```bash
   git worktree remove "$WT"
   git worktree prune
   ```

4. **Delete the local branch:**
   ```bash
   git branch -d "$BRANCH"
   ```
   Use `-d`, never `-D`. `-d` refuses to delete a branch whose commits are not
   reachable — for a squash-merged PR it will refuse even though the work did
   land. That refusal is information: verify with
   `gh pr view "$PR" --json mergeCommit` that the commit is on the default
   branch, then use `-D` and say in the summary that you did.

5. **Delete the remote branch** only if it still exists — GitHub's auto-delete
   usually handled it: `git push origin --delete "$BRANCH"`.

6. **Prune the empty parent.** The user's worktrees live in
   `<project>-worktrees/`. `rmdir` it when it is empty; leave it otherwise.

---

## Phase 3 — Refresh the plugin

Conditional. Claude Code loads plugins from a cache, so editing a plugin's
source repository changes nothing about the running install until the cache is
replaced. This phase closes that gap.

### Detect first, then confirm

The session touched a plugin if any of these hold:

```bash
ls .claude-plugin/plugin.json plugin.json 2>/dev/null
ls .claude-plugin/marketplace.json 2>/dev/null
```

or the repo is one the user's marketplace publishes — check against
`~/.claude/plugins/known_marketplaces.json` and the `plugins` array in
`~/.claude/plugins/marketplaces/<mkt>/.claude-plugin/marketplace.json`.

When detected, show the user the version chain and ask before touching
anything. This phase mutates global state outside the repo, so a silent run is
the wrong default:

```
plugin.json version:      X.Y.Z
git tag:                  <name>--vX.Y.Z present / missing
marketplace entry:        matches / stale / no version pinned
installed (installed_plugins.json): A.B.C
cache dirs present:       <list from cache/<mkt>/<plugin>/>
```

### The chain, source outward

1. **Version bumped and pushed?** `plugin.json` must carry the new version, and
   the commit must be on the remote. A cache refresh pulls from the remote, so
   an unpushed bump refreshes to the old code and looks like the cache failed.

2. **Tag it.** `claude plugin tag` validates that `plugin.json` and the
   enclosing marketplace entry agree before creating `<name>--v<version>`:
   ```bash
   claude plugin tag --dry-run          # read the verdict first
   claude plugin tag --push -m "…"
   ```
   A mismatch reported here is the actual bug — fix the manifests, do not force
   past it.

3. **Update the marketplace.** The marketplace is a git clone under
   `~/.claude/plugins/marketplaces/<name>/`. If its `marketplace.json` pins a
   version for this plugin, that repo needs its own commit first. Then:
   ```bash
   claude plugin marketplace update <marketplace>
   ```

4. **Reinstall the plugin:**
   ```bash
   claude plugin update <plugin> --yes
   ```

5. **Purge the stale cache — carefully.** Installs land in
   `~/.claude/plugins/cache/<marketplace>/<plugin>/<version-or-hash>/`. Old
   directories accumulate and Claude Code may resolve to one of them:
   ```bash
   ls -lt ~/.claude/plugins/cache/<marketplace>/<plugin>/
   ```

   > **Check for symlinks into the cache before deleting anything.** The user's
   > `CLAUDE.md` imports `@~/.claude/sui-pilot/agents/sui-pilot-agent.md`, and
   > `~/.claude/sui-pilot` is a symlink into one specific cache directory. Delete
   > that directory and the import breaks silently in every future session.
   > Resolve it first, and repoint the symlink at the new install before removing
   > the old directory:
   > ```bash
   > readlink ~/.claude/sui-pilot
   > ln -sfn ~/.claude/plugins/cache/<mkt>/<plugin>/<new> ~/.claude/sui-pilot
   > ```
   > Treat any other symlink under `~/.claude` the same way — check before you
   > delete, not after.

6. **Verify, then say a restart is needed.** `claude plugin update` states this
   itself: the running session keeps the old code in memory. Confirm the install
   and stop there — the user restarts when they choose:
   ```bash
   claude plugin list
   claude plugin validate <path-to-plugin>
   ```

### Do not commit `settings.json`

`enabledPlugins` is machine-local and held back with `git update-index
--skip-worktree`. If a plugin operation dirties `settings.json`, leave it. The
lift-commit-reset procedure in the root `CLAUDE.md` is a deliberate act, not
part of a wrap-up.

---

## Phase 4 — Report

Close with a short status in Simplified Technical English. Say what happened,
including what did not:

```
kthxbai — <project>

Memories:   <N> written, <N> updated
Evicted:    <N> — <name: why it stopped being true>
Checkpoint: <project>-checkpoint <replaced / deleted, work landed / none>
Index:      <N> lines, ~<N> tokens
Handoff:    <path or "none needed">
Branch:     <deleted / kept — reason>
Worktree:   <removed / kept — reason>
Plugin:     <refreshed to vX.Y.Z, restart required / not applicable>
Open items: <uncommitted files, unpushed commits, open PRs>
```

Name every eviction and why. A deletion the user does not hear about is
indistinguishable from a memory that was never written, and they lose the chance
to say "no, keep that one".

End the turn with a `vlerv://open?path=…` deep-link to every artifact written.

A phase that refused is a result, not a failure. State the reason in one line
so the user knows what is waiting for them tomorrow.
