# Claudefiles Audit Report

**Date:** 2026-02-02
**Scope:** Symlink integrity, stray file scan, skill extraction candidates, cleanup checklist
**Plan:** `docs/plans/2026-02-02-claudefiles-audit.md`

---

## Phase 1: Symlink Integrity — PASS

All 4 symlinks are valid and point to the correct targets:

| Symlink | Target | Status |
|---------|--------|--------|
| `~/.claude/CLAUDE.md` | `~/workspace/claudefiles/CLAUDE.md` | OK |
| `~/.claude/commands` | `~/workspace/claudefiles/commands` | OK |
| `~/.claude/skills` | `~/workspace/claudefiles/skills` | OK |
| `~/.claude/settings.local.json` | `~/workspace/claudefiles/settings.local.json` | OK |

**No unexpected symlinks found.** All other items in `~/.claude/` are real (local-only) files and directories as expected.

**Repo status:** `CLAUDE.md` is modified (unstaged), `docs/` is new (this audit), and 4 skills are untracked (`pdf-visual-to-css-svg`, `sui-balance-json-parsing`, `sui-marp-slide`, `technical-docs-to-learning-materials`).

---

## Phase 2: Stray File Scan

### CLAUDE.md Files Found (10 total)

| Path | Category | Notes |
|------|----------|-------|
| `claudefiles/CLAUDE.md` | Source of truth | Global config — correct |
| `sui-move-bootcamp/CLAUDE.md` | Project-specific | Bootcamp structure, 88 lines |
| `optimistic_oracle/CLAUDE.md` | Project-specific | UMA port architecture, 157 lines |
| `cardboard_tracker/CLAUDE.md` | Project-specific | TCG trading dApp, 196 lines |
| `bhutan_rsebl/CLAUDE.md` | Project-specific | Bond exchange (RWA), 155 lines |
| `trade-wars/CLAUDE.md` | Project-specific | Sui game, Move + React, 291 lines |
| `flow-hack/CLAUDE.md` | Project-specific | Security research, 82 lines |
| `deepbookv3/CLAUDE.md` | Project-specific | Outside 3-week window |
| `sui/CLAUDE.md` | Project-specific | Outside 3-week window |
| `ts-sdks/CLAUDE.md` | Project-specific | Outside 3-week window |

**Verdict:** All project-specific CLAUDE.md files are legitimate. No stray files.

### .claude/ Directories Found (12 total)

| Path | Contents | Notes |
|------|----------|-------|
| `claudefiles/.claude/` | `settings.local.json` | Repo-local override — correct |
| **`~/workspace/.claude/`** | **`settings.local.json`** | **ANOMALY — see below** |
| `suipools/.claude/` | `settings.local.json` | Project-local |
| `walrus_training_program/.claude/` | `settings.local.json` | Project-local |
| `sui-move-bootcamp/.claude/` | `settings.local.json` | Project-local |
| `optimistic_oracle/.claude/` | `settings.local.json` | Project-local |
| `cardboard_tracker/.claude/` | `settings.local.json` | Project-local |
| `trade-wars/.claude/` | `settings.local.json` | Project-local |
| `walrus/.claude/` | `settings.local.json` | Project-local |
| `bootcamp-seal/Seal/.claude/` | `settings.local.json` | Project-local |
| `seal-docs/.claude/` | `settings.local.json` | Project-local |
| `pinchy/.claude/` | `settings.local.json` | Project-local |

### Workspace-Root .claude/ Anomaly

**Path:** `~/workspace/.claude/settings.local.json`
**User confirmed:** Unintentional. Desired model is global permissions in `~/.claude/settings.local.json` (via claudefiles), with per-project overrides only.

**Contents (permissions that may need migration to global):**
- `Bash(echo:*)`, `Bash(git init:*)`, `Bash(git add:*)`, `Bash(git submodule add:*)`
- `Bash(gh repo create:*)`, `Bash(ln:*)`, `Bash(git rm:*)`
- `Bash(claude:*)`, `Bash(gh auth status:*)`, `Bash(tmux:*)`
- Linear MCP: `list_teams`, `list_projects`, `list_issues`, `get_issue`, `list_issue_labels`, `list_comments`, `list_issue_statuses`

### Stray SKILL.md / Prompt Files

**None found.** All SKILL.md files are inside `~/workspace/claudefiles/skills/`. No `.prompt` or `prompt*.txt` files anywhere.

### Dotfiles Cleanup Verification

The dotfiles repo had commits adding then removing Claude configs. **Current state is clean** — no CLAUDE.md, settings.local.json, or SKILL.md files remain.

---

## Phase 3: Skill Extraction Candidates

### Repeated Permission Patterns

These permissions appear in 4+ project-local configs and should be in the global `settings.local.json`:

| Permission | Found in |
|------------|----------|
| `Bash(sui move build:*)` | suipools, sui-move-bootcamp, optimistic_oracle, cardboard_tracker, trade-wars |
| `Bash(sui move test:*)` | suipools, sui-move-bootcamp, optimistic_oracle, cardboard_tracker, trade-wars |
| `WebSearch` | suipools, optimistic_oracle, cardboard_tracker, trade-wars, pinchy |
| `WebFetch(domain:docs.sui.io)` | sui-move-bootcamp, optimistic_oracle, cardboard_tracker |
| `WebFetch(domain:github.com)` | optimistic_oracle, cardboard_tracker, pinchy |
| `Bash(git add:*)` | suipools, walrus_training_program, sui-move-bootcamp, trade-wars |
| `Bash(git commit:*)` | suipools, walrus_training_program, sui-move-bootcamp, trade-wars |
| `Bash(git checkout:*)` | suipools, walrus_training_program, sui-move-bootcamp, trade-wars |

### CLAUDE.md Duplication Analysis

**Sections duplicated across project CLAUDE.md files that already exist in global:**

| Duplicated Section | Repos | Global Coverage |
|--------------------|-------|-----------------|
| Build commands (`sui move build/test`) | All 6 Move projects | Already in global CLAUDE.md |
| `sui client publish` command | optimistic_oracle, cardboard_tracker, trade-wars | Already in global |
| Error constant naming (`EPascalCase`) | cardboard_tracker | Already in global |
| Capability pattern documentation | cardboard_tracker, optimistic_oracle | Already in global |
| Hot potato pattern documentation | cardboard_tracker | Already in global |

**Sections NOT in global that repeat and could be generalized:**

| Pattern | Repos | Candidate for global? |
|---------|-------|-----------------------|
| Sui SDK BCS parsing patterns | trade-wars | Yes — `bcs.U64.parse()`, `bcs.vector(bcs.Address).parse()` |
| `devInspect` vs `getObject` data access strategy | trade-wars | Yes — common dApp pattern |
| Error code prefix convention per module | cardboard_tracker | Already in global, but cardboard_tracker's is more detailed |
| Agent coordination / multi-module phasing | cardboard_tracker | No — project-specific |
| CLOB / order book patterns | bhutan_rsebl | No — domain-specific |
| RWA vault+rule patterns | bhutan_rsebl | No — domain-specific |

### Skill Extraction Candidates

| Source Repo | Candidate | Rationale | Priority |
|-------------|-----------|-----------|----------|
| trade-wars | **Sui dApp frontend patterns** skill | BCS parsing, devInspect patterns, transaction building, Tailwind conventions — reusable across all Sui dApps | P2 |
| bhutan_rsebl | **Sui RWA/DeFi patterns** skill | Vault+Rule pattern, CLOB internals, bond lifecycle — useful if building more financial dApps | P2 |
| optimistic_oracle | No extraction needed | Architecture is UMA-specific, patterns already covered by global CLAUDE.md | — |
| cardboard_tracker | No extraction needed | Module phasing is project-specific, core patterns already in global | — |
| flow-hack | No extraction needed | Flow/Cadence security research, not reusable for Sui work | — |

---

## Phase 4: Cleanup Checklist

### P0 — Fix Now (Broken / Incorrect)

No P0 issues. All symlinks are valid.

### P1 — Fix Soon (Causes Confusion)

- [ ] **Remove `~/workspace/.claude/`** — Unintentional catch-all config. Before removing, migrate useful permissions to the global `~/workspace/claudefiles/settings.local.json`:
  - Consider adding to global: `Bash(git init:*)`, `Bash(git add:*)`, `Bash(git rm:*)`, `Bash(git submodule add:*)`
  - Consider adding to global: `Bash(gh repo create:*)`, `Bash(gh auth status:*)`
  - Consider adding to global: `Bash(ln:*)`, `Bash(echo:*)`, `Bash(tmux:*)`
  - Consider adding to global: `Bash(claude:*)`
  - Linear MCP permissions — decide if these belong globally or only in specific projects
- [ ] **Deduplicate project permissions** — After expanding global `settings.local.json`, remove redundant entries from these project configs:
  - `suipools/.claude/settings.local.json` — remove `sui move build/test`, `git add/commit/checkout`, `WebSearch`
  - `sui-move-bootcamp/.claude/settings.local.json` — remove `git add/commit`, `sui move build/test`
  - `optimistic_oracle/.claude/settings.local.json` — remove `sui move build/test`
  - `cardboard_tracker/.claude/settings.local.json` — remove `sui move build/test`, `WebSearch`
  - `trade-wars/.claude/settings.local.json` — remove `sui move build/test`, `git add/commit`
- [ ] **Commit untracked skills** — 4 skills in claudefiles are untracked:
  - `skills/pdf-visual-to-css-svg/`
  - `skills/sui-balance-json-parsing/`
  - `skills/sui-marp-slide/`
  - `skills/technical-docs-to-learning-materials/`

### P2 — Nice to Have

- [ ] **Add Sui dApp frontend patterns to global CLAUDE.md** — Extract from `trade-wars/CLAUDE.md`:
  - BCS parsing patterns (`bcs.U64.parse()`, `bcs.vector(bcs.Address).parse()`)
  - Data access strategy table (devInspect vs getObject vs devInspect+BCS)
  - Transaction building best practices
- [ ] **Consider a Sui RWA/DeFi skill** — If building more financial dApps, extract RWA vault+rule and CLOB patterns from `bhutan_rsebl/CLAUDE.md` into a dedicated skill
- [ ] **Review older CLAUDE.md files** — `deepbookv3`, `sui`, and `ts-sdks` were outside the 3-week window but may have stale or duplicated content worth auditing in a future pass

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Symlinks verified | 4/4 | All valid |
| CLAUDE.md files | 10 | All legitimate |
| .claude/ directories | 12 | 1 anomaly (workspace root) |
| Stray SKILL.md files | 0 | Clean |
| Stray prompt files | 0 | Clean |
| Dotfiles cleanup | Verified | Clean |
| P0 issues | 0 | — |
| P1 issues | 3 | Workspace .claude, permission dedup, untracked skills |
| P2 issues | 3 | Frontend patterns, RWA skill, older file review |
