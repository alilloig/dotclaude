# Claudefiles Audit Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Verify the integrity of the claudefiles symlink architecture, find stray Claude configs across the workspace, identify reusable skills in recently-modified repos, and produce a cleanup checklist — without deleting anything.

**Architecture:** Four-phase audit — symlink verification, stray file scan, skill extraction candidates, and cleanup proposal. Each phase produces a section in a final report file.

**Tech Stack:** Bash (find, ls, readlink, git), no external dependencies.

---

## Phase 1: Symlink Integrity Verification

Verify that every shared item under `~/.claude` is a symlink pointing into `~/workspace/claudefiles/`, and that no real files exist where symlinks should be.

### Task 1: Enumerate all items in ~/.claude

**Step 1: List all items with symlink resolution**

Run:
```bash
ls -la ~/.claude/
```

Expected: 4 symlinks pointing to `/Users/alilloig/workspace/claudefiles/`:
- `CLAUDE.md → ~/workspace/claudefiles/CLAUDE.md`
- `commands → ~/workspace/claudefiles/commands`
- `skills → ~/workspace/claudefiles/skills`
- `settings.local.json → ~/workspace/claudefiles/settings.local.json`

Everything else should be a real file/directory (local-only items).

**Step 2: Verify each symlink target exists and is valid**

Run:
```bash
for link in ~/.claude/CLAUDE.md ~/.claude/commands ~/.claude/skills ~/.claude/settings.local.json; do
  if [ -L "$link" ]; then
    target=$(readlink "$link")
    if [ -e "$target" ]; then
      echo "OK: $link -> $target"
    else
      echo "BROKEN: $link -> $target (target missing)"
    fi
  else
    echo "NOT A SYMLINK: $link (should be symlinked to claudefiles)"
  fi
done
```

Expected: All 4 print `OK`.

**Step 3: Check for unexpected symlinks or real files that should be symlinks**

Run:
```bash
# Find any symlinks in ~/.claude pointing OUTSIDE claudefiles
find ~/.claude -maxdepth 1 -type l | while read link; do
  target=$(readlink "$link")
  case "$target" in
    */workspace/claudefiles/*) echo "CORRECT: $link -> $target" ;;
    *) echo "UNEXPECTED: $link -> $target" ;;
  esac
done
```

Expected: Only the 4 known symlinks, all marked `CORRECT`.

**Step 4: Verify the repo itself is clean**

Run:
```bash
cd ~/workspace/claudefiles && git status --short
```

Expected: Only known untracked items (new skills in progress). No unexpected modifications.

**Step 5: Commit findings**

Record results in the audit report. No commit to git needed for this phase.

---

## Phase 2: Stray Claude Files Across Workspace

Scan `~/workspace` for Claude Code configuration files that live outside both `~/workspace/claudefiles/` and their respective project directories.

### Task 2: Find all CLAUDE.md files

**Step 1: Locate every CLAUDE.md under ~/workspace**

Run:
```bash
find ~/workspace -name "CLAUDE.md" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null
```

Known locations (from exploration):
| Path | Status |
|------|--------|
| `~/workspace/claudefiles/CLAUDE.md` | Source of truth (correct) |
| `~/workspace/sui-move-bootcamp/CLAUDE.md` | Project-specific (correct) |
| `~/workspace/optimistic_oracle/CLAUDE.md` | Project-specific (correct) |
| `~/workspace/cardboard_tracker/CLAUDE.md` | Project-specific (correct) |
| `~/workspace/bhutan_rsebl/CLAUDE.md` | Project-specific (correct) |
| `~/workspace/trade-wars/CLAUDE.md` | Project-specific (correct) |
| `~/workspace/flow-hack/CLAUDE.md` | Project-specific (correct) |

**Step 2: Find all .claude/ directories**

Run:
```bash
find ~/workspace -maxdepth 3 -name ".claude" -type d -not -path "*/.git/*" 2>/dev/null
```

Known locations:
| Path | Status |
|------|--------|
| `~/workspace/claudefiles/.claude/` | Repo-local override (correct) |
| `~/workspace/.claude/` | Workspace-root settings — **review needed** |
| `~/workspace/suipools/.claude/` | Project-local |
| `~/workspace/walrus_training_program/.claude/` | Project-local |
| `~/workspace/sui-move-bootcamp/.claude/` | Project-local |
| `~/workspace/optimistic_oracle/.claude/` | Project-local |
| `~/workspace/cardboard_tracker/.claude/` | Project-local |
| `~/workspace/trade-wars/.claude/` | Project-local |
| `~/workspace/walrus/.claude/` | Project-local |
| `~/workspace/bootcamp-seal/Seal/.claude/` | Project-local |

**Step 3: Flag the workspace-root .claude/ directory**

Run:
```bash
ls -la ~/workspace/.claude/
cat ~/workspace/.claude/settings.local.json
```

This is the one anomaly — a `.claude/` at workspace root rather than inside a specific project. Determine if it serves a purpose or is leftover.

**Step 4: Search for stray skill or prompt files**

Run:
```bash
# Skill files outside claudefiles
find ~/workspace -name "SKILL.md" -not -path "*/claudefiles/*" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null

# Prompt-like files
find ~/workspace -maxdepth 3 \( -name "*.prompt" -o -name "*.prompt.md" -o -name "*prompt*.txt" \) -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null
```

Expected: No SKILL.md files outside claudefiles (skills should be centralized).

---

## Phase 3: Recently-Modified Repos — Skill Extraction Candidates

Check repos with commits between January 12–February 2, 2026 for patterns, configs, or knowledge that should be generalized into reusable skills.

### Task 3: Audit each recent repo for reusable content

**Target repos** (commits in Jan 12 – Feb 2 window):
1. `suipools` (Jan 31)
2. `walrus_training_program` (Jan 30)
3. `dotfiles` (Jan 29)
4. `sui-move-bootcamp` (Jan 29)
5. `bootcamp-seal` (Jan 29)
6. `optimistic_oracle` (Jan 27)
7. `cardboard_tracker` (Jan 27)
8. `bhutan_rsebl` (Jan 15)
9. `trade-wars` (Jan 14)
10. `flow-hack` (Jan 13)
11. `walrus` (Jan 13)

**Step 1: For each repo, check the CLAUDE.md for generalizable content**

Run (for each repo that has a CLAUDE.md):
```bash
for repo in sui-move-bootcamp optimistic_oracle cardboard_tracker bhutan_rsebl trade-wars flow-hack; do
  echo "=== $repo ==="
  head -50 ~/workspace/$repo/CLAUDE.md
  echo ""
done
```

Review each for patterns that repeat across projects and could become shared skills or global CLAUDE.md sections.

**Step 2: Check for project-local commands or skills**

Run:
```bash
for repo in suipools walrus_training_program dotfiles sui-move-bootcamp bootcamp-seal optimistic_oracle cardboard_tracker bhutan_rsebl trade-wars flow-hack walrus; do
  echo "=== $repo ==="
  ls ~/workspace/$repo/.claude/ 2>/dev/null
  ls ~/workspace/$repo/commands/ 2>/dev/null
  ls ~/workspace/$repo/skills/ 2>/dev/null
done
```

**Step 3: Review dotfiles repo for leftover Claude configs**

Run:
```bash
cd ~/workspace/dotfiles && git log --oneline --since="2026-01-12" --until="2026-02-03"
```

The dotfiles repo had a commit "Remove Claude Code config files" — verify the cleanup was complete:
```bash
find ~/workspace/dotfiles -name "CLAUDE.md" -o -name "settings.local.json" -o -name "SKILL.md" 2>/dev/null
```

**Step 4: Summarize extraction candidates**

For each repo, assess:
- Are there CLAUDE.md patterns duplicated across projects that belong in the global CLAUDE.md?
- Are there project-local `.claude/settings.local.json` overrides with permission patterns worth standardizing?
- Is there domain knowledge (Walrus, DeFi pools, etc.) worth extracting as a new skill?

---

## Phase 4: Cleanup Checklist

Based on findings from Phases 1–3, produce a checklist of proposed actions. **Do not execute any of these.**

### Task 4: Generate the cleanup checklist

**Step 1: Compile findings into a checklist**

Template:
```markdown
## Cleanup Checklist

### Symlink Issues
- [ ] (list any broken or missing symlinks)
- [ ] (list any real files that should be symlinks)

### Stray Files
- [ ] ~/workspace/.claude/settings.local.json — determine if needed or remove
- [ ] (list any SKILL.md files found outside claudefiles)
- [ ] (list any orphaned Claude configs in dotfiles)

### Skill Extraction Candidates
- [ ] [Repo]: [description of reusable pattern] → extract as skill to claudefiles/skills/[name]/
- [ ] [Repo]: [CLAUDE.md section] → merge into global CLAUDE.md

### CLAUDE.md Deduplication
- [ ] (list sections duplicated across project CLAUDE.md files that belong in global)

### Dotfiles Cleanup
- [ ] Verify ~/workspace/dotfiles has no remaining Claude config artifacts
```

**Step 2: Prioritize items**

Mark each item as:
- **P0 — Fix now**: Broken symlinks, security issues
- **P1 — Fix soon**: Stray configs that cause confusion
- **P2 — Nice to have**: Skill extraction, deduplication

---

## Execution Notes

- **Total phases**: 4
- **Total tasks**: 4
- **Destructive actions**: None. This plan only reads and reports.
- **Output file**: `docs/plans/2026-02-02-claudefiles-audit-report.md`
- Write all findings and the cleanup checklist into the output file as you go.
- Use AskUserQuestion when anything is ambiguous (e.g., whether `~/workspace/.claude/` is intentional).
