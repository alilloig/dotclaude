# Global Claude Code Guidelines

## dotclaude repo: machine-local plugin state

This file lives in the "dotclaude" repo (`~/.claude` → `~/workspace/dotfiles/.claude`).
Plugin enable/disable state in `settings.json` (`enabledPlugins`) is **machine-local
by policy** — it must never sync between machines through git.

- After cloning on a new machine, run:
  `git -C ~/.claude update-index --skip-worktree settings.json`
- Do not move plugin flags to a user-level `settings.local.json`: Claude Code
  ignores `enabledPlugins` there (verified on v2.1.240).
- To commit an intentional `settings.json` change: lift the flag with
  `git -C ~/.claude update-index --no-skip-worktree settings.json`, commit,
  then set the flag again.

## Tooling defaults

- **TypeScript** over JavaScript — always `.ts`/`.tsx`
- **pnpm** — never npm or yarn
- Stack choices (frameworks, chains, languages) are per-project: define them
  in each project's own CLAUDE.md — when starting or adopting a project,
  write its preferred stack there (create the file if missing) rather than
  assuming global defaults
- **Sui / Move projects**: when you start or adopt one, add this line to that
  project's own CLAUDE.md (create the file if missing):
  `@~/.claude/sui-pilot/agents/sui-pilot-agent.md`
  That path is a symlink to the installed `sui-pilot` plugin, so it tracks the
  plugin version. Read the bundled corpora at
  `~/.claude/sui-pilot/.<source>-docs/` — use that path in place of the
  `${CLAUDE_PLUGIN_ROOT}/.<source>-docs/` form the agent file states, because
  `${CLAUDE_PLUGIN_ROOT}` does not expand inside a CLAUDE.md import.

## Asking before building

**IRON LAW FOR SCOPE — run this gate before you start a prompt, and again at
every fork you hit mid-task.** This gate **overrides** the harness default that
tells you to act on sensible defaults when you have enough information. When
the gate fires, an `AskUserQuestion` call is the correct action. It is not a
failure to act, and it is not a request for permission.

GATE (this is the whole trigger): does the next step depend on any item below?
→ **yes = stop and call `AskUserQuestion` with concrete options.**

- **Scope** — what is in, what is out, how far the change reaches.
- **Design fork** — two or more workable designs with different later cost.
- **Priority or order** — what to build first, what to defer.
- **Visible behaviour** — naming, copy, defaults, error text, UX.
- **Hard to undo** — data shape, public API, new dependency, a migration.
- **Target** — which repo, branch, worktree, environment, or account.
- **A value I never gave you** — anything you would otherwise invent.

DO NOT ask about these. Decide them yourself and state the decision in one
line:

- Code format, internal names, file layout, test structure.
- Implementation details behind a settled interface.
- Obvious CRUD, boilerplate, mechanical refactors.
- Permission to continue work I already asked for.

How to ask:

- Give 2-4 concrete options, never an open question. Put your recommendation
  first and mark it `(Recommended)`.
- Batch every open question into one `AskUserQuestion` call.
- Ask at the right moment: first do all work that does not depend on the
  answer, then ask.
- One unresolved fork is enough to fire the gate. Do not average several small
  uncertainties into "clear enough to start".

### Exploratory and greenfield prompts

Trigger: I describe a goal instead of a change — new project, new feature,
MVP, spec, PoC, "I want to build X", "no sé por dónde empezar" — **and** at
least one of these is missing: success criteria, constraints, scope boundary.

Action: **offer `/find-unknowns` through `AskUserQuestion` before you write
code.** Make the skill one option and "skip it, just build" another. Do not
enter the skill on your own. Do not start to implement while the question is
open.

## Communication

- Truly concise, tl;dr by default — answer in a few sentences leading with the
  conclusion; never pad with process narration or restated context. If an
  answer genuinely can't fit that shape (deep explanations, multi-part
  analysis), keep the chat reply to the tl;dr and put the full version in an
  HTML artifact instead of a long chat message.
- Prefer asking over assuming — see **Asking before building** above; that
  section is the rule, this bullet is only the pointer.
- Spanish-friendly — user is native Spanish speaker, switch freely if helpful
- **IRON LAW FOR COMS** **ASD-STE100 Simplified Technical English — run this gate on every message
  before you send it, not once at task start.** GATE (this is the whole
  trigger): does the message report a result or status, describe what you
  implemented, fixed, or reviewed, or explain a specific change? → **yes = write
  it in STE.** Researching, brainstorming, weighing options, thinking out loud,
  and non-technical chat → normal language. A message is scoped even mid-
  investigation: the status and result parts are STE even when the surrounding
  diagnosis is exploratory (do not use "it was still exploratory" to skip the
  gate on a status report). LINT the draft before sending — rewrite out any
  idiom, metaphor, analogy, phrasal verb, or slang (e.g. "smoking gun", "talk is
  cheap", "sit tight", "cherry on top", "punch above its weight"), any sentence
  over ~25 words, and any synonym used only for variety. STE style: active
  voice; present tense unless another tense is necessary; one topic per
  sentence; ~20 words max per instruction sentence, ~25 per descriptive; ~6
  sentences max per paragraph; one word with one meaning. Code identifiers,
  commands, error text, and quoted output are Technical Names — verbatim,
  exempt.

## Deliverables

A "deliverable" = any document meant for review: report, audit, plan, review,
analysis, explainer, design doc. Not throwaway snippets or code-only output.

- Deliverables ship as self-contained HTML; markdown only for short chat
  replies and code-only outputs
- No specialized skill fits → `html-artifact`; share only via `publish-html`,
  never auto-publish. This rule also covers the built-in `Artifact` tool: do
  not publish with it unless I ask, even though that tool's own default allows
  proactive publishing.
- End the turn with a clickable Vlervtifacts deep-link to every deliverable,
  unprompted:
  - Form: `[<filename or short title>](vlerv://open?path=<abs path>)` — never
    a bare URL. macOS routes the `vlerv://` scheme straight to
    `Vlervtifacts.app`.
  - Encode everything outside RFC 3986 unreserved chars (`A-Za-z0-9-_.~`);
    slashes become `%2F`
  - Add `&line=N` to open the file at a line. Use
    `vlerv://reveal?path=<abs path>` to reveal a file instead of opening it.
  - Fallback: plain path or `file://` when Vlervtifacts doesn't apply, or the
    user asked for a different app
