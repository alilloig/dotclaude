---
name: lfg
description: |
  One-command "ship + harden + review + adjudicate + explain" pipeline for a
  pull request. Runs five phases from the main session: (1) preflight moves the
  work into a fresh git worktree under `.claude/worktrees/` if it is sitting in
  the main checkout, then /commit-push-pr branches, commits, pushes and opens a
  DRAFT PR; (2) /simplify then a second commit; (3) the pr-review-toolkit review
  skill fans out fresh-context specialist reviewers (pinned to Opus) — or, with
  the `--codex` flag, a Codex ORCHESTRATOR session (gpt-6-astra, low effort) that
  dispatches one adversarial Codex reviewer per dimension (gpt-5.6-sol, high
  effort), fact-checks their findings and posts them itself; `--super` runs BOTH
  tracks in parallel and posts two independent reviews. Either way the findings
  land as a GitHub PR review with inline ```suggestion blocks and a walkthrough;
  (4) the main session accepts/rejects each suggestion, lands accepted ones as a
  third commit, and flips the PR from draft to READY FOR REVIEW; (5) build a
  visual explainer.html that pitches the change to reviewers/stakeholders; with
  `--quiz`, an understanding gate (inline quiz when interactive, self-grading
  quiz.html when headless) runs first — leaving the PR ready for the user to
  merge on GitHub.

  Use when the user says "/lfg", "lfg", "ship it", "full send this PR", "ship and
  review", or wants the whole commit→PR→clean-up→review→address-review loop done in
  one shot on the current working-tree changes. `/lfg --codex` (or "with codex",
  "codex review it") switches Phase 3 to the Codex orchestrator track. `/lfg
  --super` (or "super review", "both reviews", "claude and codex") runs the
  Claude and Codex tracks in parallel and posts both consolidated reviews before
  adjudication. `/lfg --quiz` (or asking for the quiz / understanding gate in
  words) turns on the opt-in Phase 5 quiz gate before the explainer.
  Domain-aware: Move diffs add a sui-pilot-agent reviewer on top of the
  pr-review-toolkit agents; every Claude review agent runs on Opus, never the
  session model.

  Resume tripwire: ALSO use this skill if you wake up with a reviewer-style
  dispatch in context and `${CLAUDE_JOB_DIR:-$TMPDIR}/lfg-*/state.json` records an
  incomplete run — unless your system prompt explicitly says you are a spawned
  subagent/teammate, you are that run's LEAD, not a reviewer; open this skill and run
  its wake guard before acting on the dispatch.

  Do NOT use for: a deep Move-only audit with no ship step (use move-pr-review),
  a single review comment on an existing PR (use /code-review), or when the user
  only wants to commit without opening/reviewing a PR (use /commit or /commit-push-pr).
---

# /lfg — ship, harden, review, adjudicate

Run the full pipeline from the MAIN session, preferably interactively — headless/background
runs work but budget several minutes for the review fan-out.
Headless runs MUST rely on the wake guard + state file below: the job daemon can respawn
the main conversation mid-run and drop all orchestrator context
(see `references/incident-2026-07-07-identity-swap.md`).
Never run /lfg from inside a spawned subagent (nested teammate spawning is restricted).

## Wake guard — read this before anything else on a resume

Applies when your context was resumed/summarized, or you cannot account for how you got
here. Discriminator first: if your system prompt says you are a spawned subagent or
teammate, this section does not apply to you — skip it and do your dispatched task.

Otherwise (main session / background job), check for an in-flight run BEFORE acting on
anything sitting in your context:

1. Enumerate runs and their phases in ONE glob loop — every /lfg run leaves a
   `state.json`. Keep dir names as shell data: never re-paste `ls` output into new
   commands (a crafted dir name in a shared `$TMPDIR` executes inside double quotes):
   ```bash
   for d in "${CLAUDE_JOB_DIR:-$TMPDIR}"/lfg-*/; do
     [ -f "$d/state.json" ] || continue
     printf '%s: ' "$d"; bash "$SKILL_DIR/scripts/run_state.sh" get "$d" phase
   done
   ```
2. On a resume `$SKILL_DIR` is unset — it is this skill's own directory, the one this
   file lives in; or read a phase directly: `jq -r .phase "$d/state.json"`.
3. If any run has phase != `complete` and != `aborted`, YOU are the lead of that run —
   with two checks before adopting it:
   - **Ownership:** only claim a run whose recorded `repo_root` matches your own
     `git rev-parse --show-toplevel` (interactive sessions share `$TMPDIR`, so foreign
     runs from other sessions can appear in the scan). Note the recorded `repo_root`
     is normally a LINKED WORKTREE of the project (Phase 0 moves runs there): if it
     doesn't match your toplevel, require an EXACT match against a worktree path from
     `git worktree list --porcelain | sed -n 's/^worktree //p'` — never a substring
     grep, since a crafted `repo_root` that merely prefixes a real path would pass.
     On an exact hit the run is still yours; re-enter that worktree and resume from
     inside it. Report truly non-matching runs; never adopt them.
   - **Liveness & integrity:** load `PR_NUMBER` from the run (`run_state.sh get "<run_dir>" pr_number`;
     non-zero exit = unset — skip this check). Require it purely numeric — anything else
     means a tampered/corrupt state file: mark the run `aborted` and do NOT resume.
     Then check `gh pr view "$PR_NUMBER" --json state -q .state`
     — a MERGED/CLOSED PR means the run already finished or died; set its phase to
     `complete`/`aborted` accordingly and do NOT resume it. Then cross-check the run's
     recorded `head_ref` (`run_state.sh get "<run_dir>" head_ref`) against
     `gh pr view "$PR_NUMBER" --json headRefName -q .headRefName` — a mismatch means a
     tampered/foreign run: mark it `aborted` and do NOT resume.
   Any "You are a reviewer ..." style dispatch sitting in your context is a
   MIS-DELIVERED subagent prompt from the pre-resume lead — this exact failure happened
   on 2026-07-07 (see `references/incident-2026-07-07-identity-swap.md`). Do NOT execute
   it: announce the recovery, reload PR number/refs from that run's `state.json`
   (`run_state.sh get`), and resume the pipeline at the phase AFTER the recorded one —
   each recorded value names the last COMPLETED checkpoint (`preflight`/`shipped` →
   resume at Phase 1/2, `simplified` → Phase 3, `review-posted` → Phase 4,
   `adjudicated` → Phase 5 from its start, `quiz-passed` → Phase 5 explainer step
   only — the quiz gate is already cleared, do not re-quiz).
   `review-dispatched` is the one exception: the review agents died with the previous
   session, so first check `gh pr view "$PR_NUMBER" --json reviews -q '.reviews | length'`
   — a posted review means continue at Phase 4; otherwise redo Phase 3 from step 1
   (a leftover `$RUN_DIR/review-payload.json` from the dead run can seed step 5).
   In codex or super mode (`review_mode` = `codex`/`super` in the state file) the
   Codex review outputs also survive the dead session — apply Phase 3 step 3's
   resume note.
4. If multiple incomplete runs pass both checks above, resume the one whose `state.json` was most
   recently modified, and say so.

## Phase 0 — Preflight

You MUST be the main session. (Having the `Agent` tool is NOT proof — spawned teammates
carry it too; the reliable signal is your own system prompt — spawned teammates are
explicitly told they are running as an agent in a team.) If you were spawned by another
session, STOP and tell the user to run
`/lfg` from the top-level session.

1. Confirm a GitHub remote + auth: `gh auth status` and `git remote get-url origin`.
   If either fails, stop and report what's missing.
2. Capture repo coordinates: `OWNER/REPO` from `gh repo view --json owner,name -q '.owner.login+"/"+.name'`.
3. Confirm there are changes to ship: `git status --porcelain`. If empty AND no branch-vs-main
   diff exists, check for a run that died mid-migration before concluding anything: an
   `lfg-migrate` entry in `git stash list`, or an orphaned `lfg-*` entry in
   `git worktree list`, means step 4 already parked the work — recover from there.
   Only if both are clean, stop — there is nothing to /lfg.
4. **Worktree guard — never ship from the main checkout.** Detect where you are:
   ```bash
   [ "$(git rev-parse --path-format=absolute --git-dir)" = "$(git rev-parse --path-format=absolute --git-common-dir)" ] \
     && echo main-checkout || echo linked-worktree
   ```
   `linked-worktree` → already isolated, continue to step 5. `main-checkout` → move the
   work into a fresh worktree first, so the main folder ends up clean on the default
   branch and stays free for new work:
   1. Capture `TOPLEVEL="$(git rev-parse --show-toplevel)"` and
      `DEFAULT_BRANCH="$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name)"`.
   2. If `git status --porcelain` is non-empty, park the changes:
      `git stash push -u -m lfg-migrate`. (Stashes live in the shared git dir, so the
      new worktree can pop them.) Also record `ORIG_BRANCH="$(git branch --show-current)"`
      and `ORIG_SHA="$(git rev-parse HEAD)"` — sub-step 3 mutates the main checkout, so a
      blanket "pop back in the main checkout" would apply the diff onto a different base
      than the stash was taken from. If a later sub-step fails BEFORE sub-step 5's pop:
      pop inside `$WT` if the worktree already exists, otherwise restore the main checkout
      first (`git switch "$ORIG_BRANCH"` if sub-step 3 already switched away,
      `git reset --hard "$ORIG_SHA"` if it already reset) and `git stash pop` there.
      After sub-step 5's pop there is no stash left. Never leave the work stranded.
   3. Create the worktree where Claude Code puts them — INSIDE the project, at
      `WT="$TOPLEVEL/.claude/worktrees/lfg-<slug>"` (short kebab slug for the
      work). Because the worktree now sits inside the git tree, ignore it FIRST
      or step 3's "is there anything to ship" check, Phase 2's `git add -A`, and
      every later `git status` would all see it as untracked content:
      ```bash
      mkdir -p "$TOPLEVEL/.claude/worktrees"
      git -C "$TOPLEVEL" check-ignore -q .claude/worktrees \
        || echo '.claude/worktrees/' >> "$(git -C "$TOPLEVEL" rev-parse --path-format=absolute --git-common-dir)/info/exclude"
      ```
      If `.claude` is itself a submodule or a nested repo (the dotfiles repo is
      one), the parent stops at the submodule boundary but the INNER repo still
      sees the directory — add the rule there too. Compare TOPLEVELS to detect
      that: a bare `rev-parse --show-toplevel` walks up, so it succeeds for an
      ordinary `.claude/` directory too and would write the rule into the wrong
      repo's exclude file:
      ```bash
      CLAUDE_TOP="$(git -C "$TOPLEVEL/.claude" rev-parse --show-toplevel 2>/dev/null || true)"
      [ -n "$CLAUDE_TOP" ] && [ "$CLAUDE_TOP" != "$TOPLEVEL" ] \
        && { git -C "$TOPLEVEL/.claude" check-ignore -q worktrees \
             || echo 'worktrees/' >> "$(git -C "$TOPLEVEL/.claude" rev-parse --path-format=absolute --git-common-dir)/info/exclude"; }
      ```
      Then create it:
      - On `$DEFAULT_BRANCH` → mint the PR branch here (Phase 1's /commit-push-pr then
        sees a non-default branch and skips branching): `git worktree add "$WT" -b <slug>`.
        If the default branch also carried UNPUSHED local commits, they ride along on
        the new branch (it was created at HEAD); after confirming that with
        `git -C "$WT" log --oneline "origin/$DEFAULT_BRANCH..HEAD"` (non-empty output) and
        `[ "$(git -C "$WT" rev-parse HEAD)" = "$(git rev-parse HEAD)" ]`, drop them from the main checkout with
        `git fetch origin "$DEFAULT_BRANCH" && git reset --hard "origin/$DEFAULT_BRANCH"` (safe: the tree is clean post-stash
        and the commits now live on the worktree branch).
      - On a non-default branch `X` → move that branch into the worktree: a branch can
        only be checked out in one worktree, so first `git switch "$DEFAULT_BRANCH"`
        (tree is clean post-stash), then `git worktree add "$WT" X`.
      - Detached HEAD (e.g. a submodule checkout) → treat like the default-branch case:
        `git worktree add "$WT" -b <slug>` mints the branch at HEAD; skip the
        `git reset --hard` step and leave the main checkout where it was.
   4. Enter the worktree — prefer the `EnterWorktree` tool with `path: "$WT"` (it
      re-points the session's file tools there); otherwise `cd "$WT"` in Bash.
      `EnterWorktree` only accepts a `path` under `.claude/worktrees/` of the
      same repository, which is exactly where sub-step 3 put it. Do NOT call
      `EnterWorktree` with `name` instead: that mints its OWN worktree off
      `origin/<default-branch>`, which is not the branch holding your work.
   5. If sub-step 2 stashed: `git stash pop` (now inside the worktree) and confirm
      `git status --porcelain` shows the work again.
   6. Re-run the detection command — it MUST now print `linked-worktree`. Everything
      from here on (run dir, PR, review, adjudication commits) runs from the worktree.
5. Note `SKILL_DIR` = the absolute path of this skill's directory (for calling its scripts).
6. Create a gitignored run dir OUTSIDE the repo for findings/payloads:
   `RUN_DIR="${CLAUDE_JOB_DIR:-$TMPDIR}/lfg-$(git rev-parse --short HEAD 2>/dev/null || echo run)"`
   then `mkdir -p "$RUN_DIR"`, then seed the run state:
   `bash "$SKILL_DIR/scripts/run_state.sh" init "$RUN_DIR"`. If `init` refuses
   ("run in flight"), a previous run of this HEAD is still incomplete — run the wake
   guard above instead of re-initializing (use `init --force` only for a deliberate
   restart). Note: two live interactive sessions on the same repo+HEAD share this
   RUN_DIR, so on an interactive `init` refusal confirm with the user that no other
   live session owns the run before adopting it via the wake guard. Then record ownership so the wake guard can tell this run from foreign ones:
   `bash "$SKILL_DIR/scripts/run_state.sh" set "$RUN_DIR" repo_root "$(git rev-parse --show-toplevel)"`
   and `set "$RUN_DIR" skill_dir "$SKILL_DIR"`. Record every non-default invocation
   flag in the run state in that same Bash call — resumes read state, never re-guess
   the invocation, and a missing key means the default: `--codex` (or a Codex/
   cross-model review asked in words) → `set "$RUN_DIR" review_mode codex`;
   `--super` (or "super review" / "both reviews" / "claude and codex" in words) →
   `set "$RUN_DIR" review_mode super` (default `agents`; `--super` wins if both
   flags are given); `--quiz` (or the understanding quiz asked in words) →
   `set "$RUN_DIR" quiz_gate on` (default `off`). Verify the seed took:
   `test -f "$RUN_DIR/state.json"` — never proceed without it. Remember this path for
   Phases 3–4. From here on, every stop-and-report exit must first checkpoint
   `bash "$SKILL_DIR/scripts/run_state.sh" set "$RUN_DIR" phase aborted` so the wake
   guard never resurrects a dead run.

## Phase 1 — Ship (/commit-push-pr, as a DRAFT)

Invoke the `/commit-push-pr` skill, telling it the PR must be opened as a **draft**
(`gh pr create --draft`). It branches off the default branch if needed (usually not —
Phase 0's worktree guard already minted the branch), makes one commit, pushes, and opens
the PR. It stays a draft through the review, and Phase 4 flips it to ready once the
agentic work is done (Phase 3's post fallback can flip it earlier); the user merges it
at the end.
After it completes, capture for later phases:

- `PR_NUMBER`: `gh pr view --json number -q .number`
- Draft check: `gh pr view --json isDraft -q .isDraft` — if `false` (the sub-skill
  ignored the instruction), convert it back: `gh pr ready "$PR_NUMBER" --undo`. Drafts
  are plan-gated (gh: "if supported by your plan") — if draft creation/conversion is
  rejected because the repo's plan lacks draft PRs, continue non-draft; don't abort.
- `BASE_REF` / `HEAD_REF`: `gh pr view --json baseRefName,headRefName -q '.baseRefName+" "+.headRefName'`
- `HEAD_SHA`: `git rev-parse HEAD`
- changed files vs base: `git diff --name-only "$BASE_REF"...HEAD` (this is the review scope)

If `/commit-push-pr` did not result in an open PR (e.g. push failed), checkpoint
`bash "$SKILL_DIR/scripts/run_state.sh" set "$RUN_DIR" phase aborted`, then stop and report.

Checkpoint: `bash "$SKILL_DIR/scripts/run_state.sh" set "$RUN_DIR" pr_number "$PR_NUMBER"`
(likewise `base_ref "$BASE_REF"` and `head_ref "$HEAD_REF"`), then `set "$RUN_DIR" phase shipped`.

## Phase 2 — Simplify (/simplify + second commit)

1. Invoke the `/simplify` skill. It edits the working tree for reuse/efficiency/clarity
   (quality only — it does NOT hunt bugs; that's Phase 3's job).
   **Headless/background sessions: single pass only.** Headless means `CLAUDE_JOB_DIR`
   is set (you are a background job). Do NOT let the simplify pass fan out its own
   multi-agent review — the 2026-07-07 run burned hours starting 4 dimension subagents,
   twice. Pass the constraint into the invocation itself (tell /simplify: "single-agent,
   do not spawn subagents"), or apply the obvious cleanups yourself as the lead, and
   move on. Interactive sessions keep the full /simplify behavior.
2. If `git status --porcelain` is now non-empty, land the cleanup as its own commit:
   ```bash
   git add -A && git commit -m "simplify" && git push
   ```
   If `/simplify` changed nothing, skip the commit (do not create an empty commit).
3. Refresh the changed-file list (it may have grown): `git diff --name-only "$BASE_REF"...HEAD`.
4. Checkpoint: `bash "$SKILL_DIR/scripts/run_state.sh" set "$RUN_DIR" phase simplified`.

## Phase 3 — Review (pr-review-toolkit, posted as a PR review)

Fresh-context agents find; YOU double-check and post. Do not review the diff yourself
before the reviewers report — your judgment enters at verification (step 4) and Phase 4.

Mode: use the `review_mode` you recorded in Phase 0 (read it back with
`run_state.sh get` only on a wake-guard resume; missing = `agents`):

- `agents` — steps 1–2 below, then steps 3–7. You verify and you post.
- `codex` — the "Codex mode" block at the end of this phase replaces steps 1–2
  AND steps 4–6: a Codex orchestrator session fact-checks and posts, not you.
  You still run step 3 and step 7.
- `super` — the "Super mode" block: both tracks run in parallel and the PR ends
  up with TWO posted reviews.

Step 3 (checkpoint) and step 7 (confirm posted) apply in every mode.

1. Invoke the `pr-review-toolkit:review-pr` skill on the PR (same sub-skill pattern as
   /simplify in Phase 2), scoped to `git diff "$BASE_REF"...HEAD`. It fans out the
   toolkit's specialist agents (code-reviewer, silent-failure-hunter, pr-test-analyzer,
   comment-analyzer, type-design-analyzer, code-simplifier) — scale the agent set to the
   diff (small diff → fewer; skip agents with no relevant files). **Pin EVERY review
   agent to `model: "opus"`** — pass it on each `Agent` dispatch; review does not need
   the session's top-tier model. The lead (you) stays on the session model.
2. Move files in the diff (`*.move`, `Move.toml`) → additionally dispatch
   `subagent_type: sui-pilot:sui-pilot-agent` (fallback chain:
   `sui-pilot:sui-pilot-agent` → `sui-pilot-agent` → `general-purpose`), also on
   `model: "opus"`, to run `/move-code-review` + `/move-code-quality` over the Move
   files and return findings as file:line + severity + concrete fix.
3. Checkpoint immediately after the reviewers are dispatched:
   `bash "$SKILL_DIR/scripts/run_state.sh" set "$RUN_DIR" phase review-dispatched`.
   (Resume note — on a wake-guard resume at this phase the reviewers died with the
   old session. Agent mode: redo this phase from step 1; a leftover
   `$RUN_DIR/review-payload.json` can seed step 5. Codex/super mode: the Codex
   outputs survive on disk — a `$RUN_DIR/codex-<dim>.json` that parses counts as
   done, and a `$RUN_DIR/codex-verdict.md` means the orchestrator already
   finished; relaunch the orchestrator only for the missing dimensions, and skip
   it entirely once step 7's review count is already satisfied.)
4. Double-check every returned finding against the actual source: re-read the cited
   lines and re-derive the problem. Drop what doesn't survive — not reachable,
   pre-existing on unmodified lines, intended behavior, or a nitpick a senior engineer
   would not raise. Keep a note of drops (count + one-liners) for the walkthrough.
5. Build `$RUN_DIR/review-payload.json` shaped as
   `{ "event": "COMMENT", "body": <walkthrough markdown>, "comments": [ {path, line, side:"RIGHT", body} ] }`:
   - One `comments[]` entry per kept finding with a concrete fix: rationale text, then a
     ```suggestion fenced block with the exact replacement for the cited line(s).
   - `line` MUST be a line present in the PR diff (added/context), or GitHub rejects the
     whole review — verify each anchor against `git diff "$BASE_REF"...HEAD` first.
   - Findings without a clean line-anchored fix go in the `body` walkthrough as prose
     (file:line + what to change), plus the dropped-FP count.
6. Post it:
   - Validate: `bash "$SKILL_DIR/scripts/post_review.sh" --check "$RUN_DIR/review-payload.json"`
   - Post: `bash "$SKILL_DIR/scripts/post_review.sh" "$OWNER" "$REPO" "$PR_NUMBER" "$RUN_DIR/review-payload.json"`
   - The PR is normally a DRAFT; GitHub accepts COMMENT reviews with inline suggestions
     on drafts. Only if the POST is rejected *specifically because of the draft state*:
     `gh pr ready "$PR_NUMBER"` and retry ONCE (do not re-draft afterwards). Never use
     APPROVE as the review event.
7. Confirm it posted — `gh pr view "$PR_NUMBER" --json reviews -q '.reviews | length'`
   must be ≥ 1 (≥ 2 in `super` mode, one review per track). If the count is short,
   name the track that failed and why before continuing — never checkpoint a phase
   that did not post. Then checkpoint:
   `bash "$SKILL_DIR/scripts/run_state.sh" set "$RUN_DIR" phase review-posted`.

### Codex mode (`--codex`) — a Codex orchestrator owns the whole review

Review tokens come from the Codex subscription instead of the Claude one. This
mode does NOT just swap the reviewers: a Codex ORCHESTRATOR session dispatches
the reviewers, fact-checks what they return, and posts the review itself. Your
job as lead is to prepare its inputs, launch it, and confirm the result — you do
not verify findings and you do not post in this mode.

Models are fixed: orchestrator `gpt-6-astra` at `low` effort, reviewers
`gpt-5.6-sol` at `high` effort.

Use `codex exec` directly, NOT the codex plugin's `adversarial-review` command.
That command forwards `--model` but never forwards a reasoning effort, so the
reviewers would silently fall back to the `model_reasoning_effort` in
`~/.codex/config.toml` — `high` would be lost without any error.

1. Confirm the CLI and locate the codex plugin's prompt template + output schema
   (version-agnostic — newest wins):
   ```bash
   codex --version || echo "CODEX MISSING"
   CODEX_PLUGIN="$(ls -d "$HOME"/.claude/plugins/cache/openai-codex/codex/*/ 2>/dev/null | sort -V | tail -1)"
   REVIEW_PROMPT="${CODEX_PLUGIN}prompts/adversarial-review.md"
   REVIEW_SCHEMA="${CODEX_PLUGIN}schemas/review-output.schema.json"
   test -f "$REVIEW_PROMPT" && test -f "$REVIEW_SCHEMA" || echo "CODEX PLUGIN ASSETS MISSING"
   ```
   If the CLI is missing or either file is absent, say so, then:
   `codex` mode → `run_state.sh set "$RUN_DIR" review_mode agents` and run the
   default steps 1–2 instead; `super` mode → drop to the agent track alone.
   Never skip the review.
2. Render the shared reviewer base prompt ONCE — the plugin template with its
   placeholders filled, plus the diff the reviewers must attack:
   ```bash
   { echo "<diff>"; git diff "$BASE_REF"...HEAD; echo "</diff>"; } > "$RUN_DIR/codex-diff.txt"
   sed -e "s|{{TARGET_LABEL}}|$BASE_REF...$HEAD_REF (PR #$PR_NUMBER)|" \
       -e "s|{{USER_FOCUS}}|__FOCUS__|" \
       -e "s|{{REVIEW_COLLECTION_GUIDANCE}}||" \
       -e "/{{REVIEW_INPUT}}/r $RUN_DIR/codex-diff.txt" \
       -e "/{{REVIEW_INPUT}}/d" "$REVIEW_PROMPT" \
       > "$RUN_DIR/codex-review-base.md"
   grep -c '{{' "$RUN_DIR/codex-review-base.md"   # MUST print 0
   ```
   The template carries FOUR placeholders — `{{TARGET_LABEL}}`, `{{USER_FOCUS}}`,
   `{{REVIEW_COLLECTION_GUIDANCE}}` and `{{REVIEW_INPUT}}`. The last one is where
   the diff belongs, inside the template's `<repository_context>` block; appending
   the diff at the end of the file instead leaves `{{REVIEW_INPUT}}` in the prompt
   and the reviewer reads a literal placeholder. Always run the `grep -c '{{'`
   check and expect `0` — if the plugin adds a placeholder in a later version, that
   check is what catches it.
   `__FOCUS__` stays in place as a marker — the orchestrator substitutes the
   per-dimension focus into its own copy.
3. Write the dimension table to `$RUN_DIR/codex-dimensions.tsv`, one
   `<dim><TAB><focus>` line per dimension. Same specialist set as agent mode,
   scaled to the diff — drop any dimension with no relevant files:
   - `bugs` — "correctness: logic errors, wrong state transitions, broken edge cases, off-by-one and boundary handling"
   - `silent-failures` — "silent failures: swallowed errors, empty catch blocks, fallbacks that hide failure, missing error propagation"
   - `tests` — "test coverage: new logic without tests, missing edge/failure-path cases, assertions that cannot fail"
   - `comments` — "comment and doc accuracy: comments or docs that contradict, overstate, or drift from the code they describe"
   - `types` — "type and API design: weak encapsulation, invariants not expressed in types, misuse-prone signatures"
   Move files (`*.move`, `Move.toml`) still go to the Claude `sui-pilot-agent`
   reviewer from step 2 of the default flow, dispatched by YOU in parallel with
   the orchestrator — Codex has no Sui/Move grounding. Hand its findings to the
   orchestrator by writing them to `$RUN_DIR/codex-move-findings.json` in the
   same shape as the schema before you launch, or post them yourself as a short
   separate review if they arrive late.
4. Write the orchestrator brief to `$RUN_DIR/codex-orchestrator.md`. It must
   carry the coordinates and the full job — the orchestrator has no other
   context. The heredoc is UNQUOTED on purpose — `$PR_NUMBER`, `$RUN_DIR`, `$BASE_REF`,
   `$OWNER`, `$REPO`, `$SKILL_DIR` and `$REVIEW_SCHEMA` must expand into the
   brief. That also means a trailing `\` would be eaten as a line continuation,
   so the reviewer command below writes `\\` to land one literal backslash.
   The closing `EOF` sits at COLUMN 0 on purpose and must stay there: `<<EOF`
   matches its terminator only at the start of a line, so an indented `EOF`
   silently swallows the rest of the block into the brief, skips the next
   command, and still exits 0. `<<-EOF` is not a fix — it strips leading tabs
   only, which markdown does not preserve.
   ```bash
   cat > "$RUN_DIR/codex-orchestrator.md" <<EOF
   You are the review orchestrator for pull request #$PR_NUMBER of $OWNER/$REPO.
   Repository root: $(git rev-parse --show-toplevel)
   Base ref: $BASE_REF    Head ref: $HEAD_REF    Run dir: $RUN_DIR
   Skill dir: $SKILL_DIR
   Reviewer output schema: $REVIEW_SCHEMA

   Do all of the following, in order, and do not stop early.

   1. DISPATCH. Read $RUN_DIR/codex-dimensions.tsv. For EACH line (dimension TAB
      focus), build its prompt and launch its reviewer. Run every dimension in
      parallel (background each command, then wait for all of them):
        sed "s|__FOCUS__|<focus>|" "$RUN_DIR/codex-review-base.md" > "$RUN_DIR/codex-prompt-<dim>.md"
        codex exec -C "<repo root>" -m gpt-5.6-sol -c model_reasoning_effort=high \\
          -s read-only --output-schema "$REVIEW_SCHEMA" \\
          -o "$RUN_DIR/codex-<dim>.json" - < "$RUN_DIR/codex-prompt-<dim>.md" \\
          > "$RUN_DIR/codex-<dim>.log" 2>&1
      Do not change the model or the effort. Do not review the diff yourself
      before the reviewers report.
   2. COLLECT. Parse each $RUN_DIR/codex-<dim>.json with jq. A file that is
      missing or does not parse is a FAILED dimension: record it by name and
      never invent its findings. If every dimension failed, write
      $RUN_DIR/codex-verdict.md saying so and stop — do not post an empty review.
      If $RUN_DIR/codex-move-findings.json exists, fold its findings in too.
   3. FACT-CHECK. This is your main job. For EVERY finding, open the cited file
      at line_start..line_end and re-derive the problem from the real source.
      Drop a finding when it is not reachable, sits on lines this PR did not
      touch, describes intended behaviour, or is a nitpick a senior engineer
      would not raise. Keep a one-line reason for each drop. Then dedupe
      same-file/same-line findings across dimensions, keeping the higher
      severity. Post only what survives.
   4. BUILD. Write $RUN_DIR/codex-review-payload.json as
      {"event":"COMMENT","body":"<walkthrough markdown>","comments":[{"path":...,"line":...,"side":"RIGHT","body":...}]}
      - One comments[] entry per kept finding that has a concrete fix: the
        rationale, then a fenced suggestion block holding the exact replacement
        for the cited lines.
      - Every "line" MUST appear in `git diff $BASE_REF...HEAD` as an added or
        context line on the RIGHT side. Verify each anchor against that diff. A
        single bad anchor makes GitHub reject the ENTIRE review.
      - Findings with no clean line anchor go in "body" as prose, with file:line.
      - Open "body" with exactly this line so the two tracks are told apart:
        **Codex adversarial review** — orchestrator gpt-6-astra (low effort), reviewers gpt-5.6-sol (high effort).
        Then list the dimensions that ran, the dimensions that failed, and the
        number of findings you dropped in fact-check.
   5. POST.
        bash "$SKILL_DIR/scripts/post_review.sh" --check "$RUN_DIR/codex-review-payload.json"
        bash "$SKILL_DIR/scripts/post_review.sh" "$OWNER" "$REPO" "$PR_NUMBER" "$RUN_DIR/codex-review-payload.json"
      If GitHub rejects the POST, fix the anchor it names and retry once.
   6. REPORT. Write $RUN_DIR/codex-verdict.md: what you posted, kept vs dropped
      counts, the one-line reason for each drop, the failed dimensions, and the
      codex session id of each reviewer.

   Hard limits: review only. Do not edit, create or delete any file inside the
   repository. Do not commit, push, approve the PR, change its draft state, or
   touch any branch. Your only writes are inside $RUN_DIR.
EOF
   ```
5. Launch the orchestrator as ONE background Bash call and checkpoint per step 3:
   ```bash
   codex exec -C "$(git rev-parse --show-toplevel)" -m gpt-6-astra \
     -c model_reasoning_effort=low -s danger-full-access \
     -o "$RUN_DIR/codex-orchestrator-final.md" - \
     < "$RUN_DIR/codex-orchestrator.md" > "$RUN_DIR/codex-orchestrator.log" 2>&1
   ```
   `danger-full-access` is required and deliberate: the orchestrator has to spawn
   the reviewer processes and reach the network for `gh`, which `read-only` and
   `workspace-write` both block. The brief's hard limits are what keep it out of
   the repo — keep them in any edit you make to the brief.
6. When it exits, read `$RUN_DIR/codex-verdict.md` and `$RUN_DIR/codex-orchestrator.log`,
   then go to step 7 to confirm the review landed. Report the orchestrator's
   kept-vs-dropped counts as your own Phase 3 numbers.
   Fallback — if the orchestrator died, never posted, or wrote no verdict: take
   over yourself. Feed every `$RUN_DIR/codex-<dim>.json` that parses into the
   default steps 4–6 (you fact-check, you build `$RUN_DIR/codex-review-payload.json`,
   you post it). Say in the walkthrough that the orchestrator failed and you
   verified the findings instead.

### Super mode (`--super`) — both tracks, two posted reviews

Run the Claude agent track and the Codex orchestrator track in PARALLEL, so the
PR carries two independent consolidated reviews before you adjudicate in Phase 4.

1. In ONE turn, dispatch the agent track (steps 1–2 of this phase, Opus-pinned)
   AND launch the Codex orchestrator (Codex mode steps 1–5). Neither track waits
   for the other.
2. Checkpoint `review-dispatched` once, after both are out.
3. Agent track: you still do steps 4–6 — verify the findings, build
   `$RUN_DIR/review-payload.json`, post it. Open its walkthrough `body` with
   exactly `**Claude agent review** — pr-review-toolkit specialists on Opus.` so
   the two reviews are distinguishable on the PR.
4. Codex track: the orchestrator posts its own review. Do not wait for it before
   posting yours, and do not post on its behalf unless its fallback fires.
5. Do NOT merge the two tracks into one review and do NOT reconcile them here.
   Where the tracks disagree is exactly the signal Phase 4 needs; collapsing it
   now removes the reason to run both.
6. If one track fails, post the surviving one, name the failed track and the
   reason, and continue. A dead track never blocks the pipeline.

## Phase 4 — Self-adjudicate

You now act as the PR author deciding what to take from the review. You do NOT
approve the PR — GitHub permissions block self-approval anyway. Readiness is no
longer the user's call: step 5 below flips the draft to ready. Merging still is.

1. Read the posted review from GitHub, not from your own memory of Phase 3 —
   in `codex` mode you never saw the findings, and in `super` mode there are two
   reviews. Fetch them:
   `gh pr view "$PR_NUMBER" --json reviews -q '.reviews[].body'` plus
   `gh api "repos/$OWNER/$REPO/pulls/$PR_NUMBER/comments"` for the inline
   suggestions. Adjudicate fresh — author hat on, reviewer hat off. For EACH
   inline suggestion and each walkthrough item, decide ACCEPT or REJECT on its
   merits (correctness + fit with the codebase). Be willing to reject low-value
   or wrong suggestions — explain why.
   In `super` mode, read BOTH reviews before deciding anything. A finding both
   tracks raise is high-confidence: take it unless you can say why both are
   wrong. Where the tracks conflict, state which one you follow and the reason —
   that disagreement is the whole point of running two tracks. Never average the
   two into a vague middle position.
2. Apply every ACCEPTED change locally by editing the file to match the suggestion. (We
   apply via local edits, not GitHub's "commit suggestion" button.)
3. If you accepted any change:
   ```bash
   git add -A && git commit -m "apply review suggestions" && git push
   ```
4. Post your adjudication so the threads aren't left dangling. Reply once summarizing
   per-item ACCEPT/REJECT (+ one-line reasons):
   ```bash
   gh pr comment "$PR_NUMBER" --body-file "$RUN_DIR/adjudication.md"
   ```
   (Best-effort: to resolve individual inline threads, fetch thread ids via
   `gh api graphql` querying `pullRequest.reviewThreads` then call the
   `resolveReviewThread` mutation per id. Skip if it adds no value.)
5. Flip the PR from draft to READY FOR REVIEW. The review is posted and the
   agentic work is finished, so the PR must stop being a draft here:
   ```bash
   gh pr view "$PR_NUMBER" --json isDraft -q .isDraft   # true → flip, false → already ready
   gh pr ready "$PR_NUMBER"
   ```
   Skip the flip when it already reports `false` (Phase 3's post fallback dropped
   the draft). If `gh pr ready` is rejected — the repo's plan lacks draft PRs, or
   the branch carries no commits — report the exact error and continue to Phase 5;
   never abort the run over the flip. You still do NOT approve the PR: GitHub
   blocks self-approval, and merging stays the user's call.
6. Confirm the final PR state: `gh pr view "$PR_NUMBER" --json state,isDraft` must
   show `OPEN` and `false`.
   Then checkpoint: `bash "$SKILL_DIR/scripts/run_state.sh" set "$RUN_DIR" phase adjudicated`.

## Phase 5 — Understand & pitch (explainer + opt-in quiz gate)

Why this phase exists: implementation time has collapsed, so the bottleneck moved to
humans understanding the code — first the author, then the reviewers. A diff read gives
only a light understanding, because most of the new code's behavior depends on EXISTING
code paths it plugs into. This phase arms the author with a visual pitch (explainer) so
reviewers start with the author's context instead of rediscovering it. The quiz gate is
OPT-IN: it runs only when the run recorded `quiz_gate` on (`--quiz` at invocation).
When on, the explainer is only built AFTER the gate — pitching code you can't answer
questions about is how bad merges happen. When off, skip steps 2–4 entirely and go
straight from step 1 to step 5.

1. Create a durable, never-committed artifact dir inside the worktree:
   ```bash
   ART_DIR="$(git rev-parse --show-toplevel)/.lfg" && mkdir -p "$ART_DIR"
   EXCLUDE="$(git rev-parse --path-format=absolute --git-common-dir)/info/exclude"
   grep -qx '.lfg/' "$EXCLUDE" 2>/dev/null || echo '.lfg/' >> "$EXCLUDE"
   ```
   (`$RUN_DIR` is wrong for these files — it dies with the job; the artifacts must
   outlive the session so the user can share the explainer.)
2. Gather quiz material: the full diff (`git diff "$BASE_REF"...HEAD`) PLUS the
   existing code paths it hooks into (callers of changed functions, config that gates
   the new code). Questions about the diff alone are trivia; questions about how the
   change behaves inside the existing system are the ones that test understanding.
3. Write 5–8 multiple-choice questions with plausible distractors. Good sources:
   runtime behavior ("what happens when X calls the new function with Y"), the edge
   cases Phase 3's review surfaced, why a rejected suggestion was rejected, which
   existing path now behaves differently. Skip syntax trivia.
4. Run the quiz — mode depends on the session:
   - **Interactive**: ask via AskUserQuestion, a few questions per call. For each
     miss, explain the correct answer with file:line references, then re-ask a
     rephrased variant in a later batch. The gate is a fully correct round. Only
     when the user has answered every question in a round correctly, checkpoint:
     `bash "$SKILL_DIR/scripts/run_state.sh" set "$RUN_DIR" phase quiz-passed`.
     If the user wants to bail out instead, do NOT record `quiz-passed`; skip to
     step 6's checkpoint, and report that the explainer was skipped because the
     quiz gate was not passed.
   - **Headless** (`CLAUDE_JOB_DIR` set): nobody is there to answer. Write
     `$ART_DIR/quiz.html` — self-contained, inline JS/CSS, no external requests —
     that grades itself and reveals the link to `explainer.html` only on a perfect
     score (client-side honor gate; the point is ritual, not security). Once
     quiz.html is written, checkpoint `phase quiz-passed` — headless delegates the
     gate to the HTML, and the explainer must exist as its unlock target.
5. **HARD GATE (quiz-on runs only) — the explainer is REFUSED until `quiz-passed`
   is recorded.** Before touching explainer.html, verify in one call:
   ```bash
   jq -e '(.quiz_gate // "off") != "on" or .phase == "quiz-passed"' "$RUN_DIR/state.json"
   ```
   If that check fails, you may not create the file — go back to step 4 (or, on an
   interactive bail-out, to step 6). Do not pre-draft explainer content anywhere —
   not in a scratch file, not "to save time", and never in the same turn that asks
   quiz questions: an interactive AskUserQuestion round must END the turn with the
   questions pending, with zero explainer work done. This gate exists because
   batching quiz + explainer together defeats the phase's purpose — pitching code
   you can't answer questions about is how bad merges happen.

   Gate passed → build `$ART_DIR/explainer.html` by invoking the `eli5` skill
   (fallback when the eli5 plugin is not installed: the `html-artifact` skill's
   conventions), with the CHANGE as the topic — the diff plus the existing code
   paths it hooks into, not the diff alone. Never auto-publish it.
   This is a PITCH, not documentation — eli5's big-pictures-few-words style IS
   the pitch language for the first screen:
   - Lead with the tl;dr: what changed and why, 3 sentences max, then a
     before/after or box-and-arrow diagram of the flow.
   - Design it like a designed page, not a generated one: few font sizes with
     strong contrast between levels (a flat type hierarchy is the tell), no
     side-tab accent borders. The same bar applies to quiz.html.
   - Past the eli5 story come the reviewer sections (normal technical language,
     not eli5): what to scrutinize (the risky 10%), what is mechanical (the
     trusted 90%), findings accepted/rejected from the review with one-line
     reasons, and the PR link.
   - Keep it one scroll for the main story; depth goes in collapsible sections.
6. Checkpoint: `bash "$SKILL_DIR/scripts/run_state.sh" set "$RUN_DIR" phase complete`.
7. Report to the user: the PR URL (the deliverable), the worktree path the work now
   lives in, the commits made (feature / simplify / apply review suggestions),
   kept-vs-dropped finding counts, what you accepted vs rejected and why, the quiz
   outcome — the score, the quiz.html link (headless), or "skipped; opt in with
   `--quiz`" (gate off), links to
   `$ART_DIR/explainer.html` (and `quiz.html` if written) as `vlerv://` deep-links,
   which review tracks ran (Claude agents, Codex orchestrator, or both in `super`
   mode) and how many reviews are posted, that Phase 4 marked the PR ready for
   review — or the exact error if the flip was rejected — and the remaining human
   action on GitHub: read the posted review(s) and merge.
