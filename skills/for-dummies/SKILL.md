---
name: for-dummies
description: |
  Generates a {PROJECT}_FOR_DUMMIES.md intro guide for any project by reading
  the actual codebase (not guessing). Use when: (1) onboarding new contributors
  or users, (2) documenting a project's architecture and quick-start in one
  place, (3) creating a plain-English entry point for a complex multi-service
  system. Covers architecture, prerequisites, boot sequence, config reference,
  common tasks, and key files — all sourced from code, not assumptions.
allowed-tools: Read, Write, Glob, Grep, Bash
author: Claude Code
version: 2.0.0
date: 2026-03-05
---

# For Dummies Guide Generator

You generate `{PROJECT}_FOR_DUMMIES.md` — a plain-English, ground-truth intro document for the current project. The filename uses the project name in UPPER_SNAKE_CASE (e.g., `TONKA_FOR_DUMMIES.md`, `DEEPBOOK_FOR_DUMMIES.md`). Derive the project name from the repo directory name or `package.json` name field. Every fact in the output must come from files you actually read. Never guess, never assume, never use training knowledge about third-party tools without verifying against real project files.

---

## Core Principle: Tutorial First, Reference Second

A "for dummies" guide serves **sequential readers** — people who start at the top and read down, wanting a journey from zero to working. It is NOT a reference document.

**Structure the document in two distinct zones:**

1. **Tutorial zone (numbered sections)** — Walks the reader from "I just cloned this" to "I'm productively using it." Each section builds on the previous one. Use numbered headings (`## 1. What Is This?`, `## 2. Prerequisites`, etc.).

2. **Reference zone (appendices)** — Comprehensive lookup material: full command tables, config references, glossaries, file maps. Use `## Appendix A:`, `## Appendix B:`, etc.

The tutorial zone answers: *"How do I go from nothing to working?"*
The reference zone answers: *"What was that flag/command/variable called?"*

**Never** put reference-density content (exhaustive command tables, full config references) in the tutorial zone. Instead, link to the appendix: *"See the full [Configuration Reference](#appendix-b-configuration-reference) at the end."*

---

## Step 1: Discover the Project

Read files in this exact priority order. Stop reading a category once you have enough context; read more if sections remain unclear.

### Priority 1 — Always read these first

- `README.md` — overview, quick start, prerequisites
- `CLAUDE.md` — architecture decisions, key commands, file structure

If the project has multiple READMEs (monorepo), read the root one first, then any sub-directory READMEs that CLAUDE.md or README.md reference.

If neither `README.md` nor `CLAUDE.md` exists, skip to Priority 2 and note at the top of `FOR_DUMMIES.md` that no README or CLAUDE.md was found.

### Priority 2 — Read if present (use Glob to find them)

- `docker-compose.yml` or `compose.yaml` — services, ports, profiles, volumes
- `package.json` or `pnpm-workspace.yaml` — scripts, workspaces, dependencies
- `Cargo.toml` — Rust binaries and workspace members
- `pyproject.toml` or `setup.py` — Python entry points and dependencies
- `Makefile` — build targets and commands
- `.env.example` — all config variables, default values, comments

### Priority 3 — Targeted reads for key flows

After reading Priority 1 and 2, identify the main entry point scripts and read them:
- Deployment/setup scripts referenced in README or package.json (e.g., `deploy-all.ts`, `install.sh`)
- Config/env loading modules (where env vars are validated and typed)
- Main service entry points (e.g., `index.ts`, `main.rs`, `app.py`)
- Any teardown/cleanup scripts

Do not read source files exhaustively. Read enough to understand the boot sequence, data flows, and configuration surface.

---

## Step 2: Decide Which Sections to Include

Based on what you found, decide which sections are relevant. Omit sections that do not apply.

### Tutorial Zone (numbered sections — always in this order)

| Section | Include when |
|---|---|
| What Is This? | Always |
| How It All Fits Together (Architecture) | Always — even simple projects benefit from a visual |
| Prerequisites | Always |
| Configuration | Config file or env vars exist |
| Installation / Getting on PATH | The project is a CLI tool or binary that needs to be made accessible |
| First-Time Setup / Build | There is a non-trivial first-time setup (build step, base image, database init) |
| Adding Data / Content | The user must load data, repos, or content before the tool is useful |
| Core Usage / Launching | Always — the primary "do the thing" action |
| Day-to-Day Workflow | Always — show a realistic session, not just isolated commands |
| Writing User-Created Files | The user must create a config file, script, or template for the tool to use |
| Rebuilding / Destructive Operations | The project has destructive operations (rebuild, reset, delete) |
| Troubleshooting | README has a troubleshooting section, or failure modes are apparent from code |

### Reference Zone (appendices — include as needed)

| Appendix | Include when |
|---|---|
| All Commands | CLI tool with >5 commands |
| Configuration Reference | >3 config variables |
| How It Boots (Under the Hood) | Non-trivial startup sequence worth documenting for the curious |
| How Data / Requests Flow | Multiple services with traceable request paths |
| Environment Comparison | Multiple environments (localnet/testnet, dev/prod) |
| Glossary | Domain-specific terms need defining |
| Important Files | Complex project with >10 key files |
| Submodule Note | `.gitmodules` exists |

---

## Step 3: Write the Document

### File Header

```markdown
# [Project Name] for Dummies

A beginner's guide to [one-line description of what the user will be doing].

---
```

No table of contents in the header. The numbered sections ARE the navigation. Readers scroll; they don't jump. (Appendices can be linked from the tutorial text when relevant.)

### Tutorial Zone Sections

#### Section: What Is This?

2–3 short paragraphs. Answer three questions:
1. What problem does this solve?
2. What does it do in concrete terms?
3. What does the user get after following this guide?

Be more concrete than the README's marketing copy — describe what actually runs, not what the project aspires to be.

#### Section: How It All Fits Together (Architecture)

Use ASCII diagrams with clear labels. Show real relationships:
- Use **arrows** to show data/communication flow direction
- Use **separate boxes** for separate processes/VMs/containers — do NOT nest boxes to imply containment unless one thing literally runs inside another
- Label communication channels (SSH, HTTP, gRPC, etc.)
- After the diagram, 2–3 sentences explaining the key components

Diagrams should be architecturally accurate. If A clones B, show them as peers with an arrow, not B inside A.

#### Section: Prerequisites

Flat bullet list with install commands. Include:
- Every tool/binary that must be installed
- Exact `brew install` / `pip install` / etc. commands — don't just name the tool
- Any one-time auth steps (e.g., `gh auth login`)
- Optional items clearly marked as **(Optional)**

#### Section: Configuration

Show a minimal, annotated config file the user can copy-paste and edit. Only include the variables a new user actually needs to set. Add inline comments explaining each.

For the full list of all variables, link to the appendix: *"See the full [Configuration Reference](#appendix-b-configuration-reference)."*

#### Section: Installation / Getting on PATH

For CLI tools: show 2 concrete options (symlink vs PATH export). Include the verify step (`tool --help`).

#### Section: First-Time Setup / Build

Step-by-step with what happens behind the scenes. Use a numbered list where each item is:
1. **Bold action** — plain-English explanation of what it does

This is where you earn the "for dummies" name. Don't just say "run this command" — explain what the command actually does so the reader isn't blindly copy-pasting.

#### Section: Core Usage

The primary action. Show the command, then explain what happens as a numbered list:
1. What the tool does first
2. What it does second
3. What the user sees / where they end up

#### Section: Day-to-Day Workflow

A single code block showing a realistic session — not isolated commands, but a narrative:

```bash
# Morning: start a new task
tool new fix-bug-123

# ... work happens ...

# Later: resume where you left off
tool resume fix-bug-123

# End of day: clean up
tool stop
```

This is more useful than a command table because it shows *when* and *why* to use each command, not just *what* it does.

#### Section: Writing User-Created Files (if applicable)

When the user must create a file (config, script, template) for the tool:
1. Explain the execution context (what shell, what user, what's already available)
2. Provide a complete, copy-paste-ready template
3. Add **DO** and **DON'T** rules specific to the context
4. Explain why idempotency matters (if applicable)

This section is critical and often missing from docs. Users need to know the constraints *before* they write the file.

#### Section: Rebuilding / Destructive Operations

For any command that destroys data, include a **"What Gets Destroyed"** table:

| What | Destroyed? |
|---|---|
| Local config | Never |
| Data in the system | Only if you confirm |
| Data pushed to remote | Never |

End with a bold warning: **Always [save/push/backup] your work before [destructive action].**

#### Section: Troubleshooting

Each item: **Bold symptom** — cause and fix in 1–2 sentences. Keep it scannable.

For complex fixes, show the debug command:
```bash
tool debug --verbose
```

### Reference Zone (Appendices)

#### Appendix: All Commands

Full table with every command. Two columns: Command | Description. One line per command.

#### Appendix: Configuration Reference

Full table with every variable: Variable | Required | Default | Description.

#### Appendix: How It Boots (Under the Hood)

For the curious. Numbered phases explaining the internal startup sequence. This is the "how the sausage is made" section — useful for debugging, not needed for daily use.

#### Appendix: Glossary

Bold term, em dash, plain-English definition in one sentence. Only domain-specific terms — not common programming concepts.

#### Appendix: Important Files

Two-column table: File | Description. Focus on files a new contributor would need to find within the first week.

---

## Step 4: Tone and Style Rules

### Tone

The guide should feel like a knowledgeable colleague walking you through setup over coffee — not a man page, not a marketing brochure.

1. **Conversational but direct**: "Here's what happens behind the scenes:" not "The following describes the internal process."
2. **Second person**: "You need:" / "Your config lives at:" — not "The user must" or "One should."
3. **Practical warnings in context**: Place warnings where they matter, not in a separate "warnings" section. Use `> **Note:**` callouts.
4. **Show empathy for common fears**: Destructive operations should say what WON'T be destroyed (e.g., "Code pushed to GitHub is never affected"). Users fear data loss more than anything.

### Writing rules

1. **Ground-truth only**: Every port number, env var name, command, file path, and package name must come from a file you read. If uncertain, re-read the source file.
2. **Short paragraphs**: 4 sentences maximum per paragraph. Prefer 2–3.
3. **Exact commands**: Every command must be copy-paste ready. Include the `cd` to the right directory when needed.
4. **Real examples**: Use actual endpoint URLs, env var names, and JSON structures from the code — not placeholders like `<your-address>` where the real shape is known.
5. **Active voice**: "The indexer reads checkpoints" not "Checkpoints are read by the indexer."
6. **No hedging**: Do not write "may", "might", "could", "typically", "usually" for facts you have verified from code.
7. **Present tense**: "The indexer reads checkpoints" not "The indexer will read checkpoints."
8. **Flat bullets in the tutorial zone**: No nested bullet lists. If you need sub-points, use a table or a new paragraph.
9. **Nested bullets OK in appendices**: Reference sections can use nesting for structure since readers are scanning, not reading linearly.

---

## Step 5: Verify Before Committing to Disk

After mentally completing all sections but before calling the Write tool, cross-check these against the source files:

- [ ] Every port number matches `docker-compose.yml` or the source code
- [ ] Every env var name matches `.env.example` exactly (case-sensitive)
- [ ] Every command matches `package.json` scripts, Makefile targets, or documented CLI
- [ ] Every file path in the Important Files table actually exists (use Glob to confirm)
- [ ] Service names in the architecture table match the `docker-compose.yml` service keys exactly
- [ ] Submodule path matches what `.gitmodules` says
- [ ] Architecture diagram accurately represents component relationships (no misleading nesting)
- [ ] Tutorial zone reads as a continuous narrative — a new user can follow it top to bottom
- [ ] Reference-heavy content is in appendices, not inline in the tutorial

If any check fails, re-read the source and correct.

---

## Output

Write to `{PROJECT}_FOR_DUMMIES.md` at the project root (same directory as `README.md`). The filename uses the project name in UPPER_SNAKE_CASE (e.g., `TONKA_FOR_DUMMIES.md`, `DEEPBOOK_FOR_DUMMIES.md`). Derive the project name from the repo directory name or `package.json` name field.

If a `*_FOR_DUMMIES.md` already exists, read it first, then overwrite it completely. Do not merge — rewrite from scratch based on current code state.

After writing, confirm by listing the file and reporting its approximate line count.
