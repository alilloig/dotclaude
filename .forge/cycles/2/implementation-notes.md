# Cycle 2 Implementation Notes: Skills + Command Surface

## Summary

Implemented all components of Cycle 2: bundled Move skills into the plugin, created slash commands, wrote sync and smoke-test scripts, refined the agent prompt with mandatory skill coordination, and created a compliance fixture demonstrating the full workflow.

## Files Created / Modified

### Skills (bundled copies, byte-for-byte identical to source)
- `plugins/sui-move/skills/move-code-quality/SKILL.md`
- `plugins/sui-move/skills/move-code-review/SKILL.md`
- `plugins/sui-move/skills/move-tests/SKILL.md`

### Slash Commands
- `plugins/sui-move/commands/move-code-quality.md` — triggers move-code-quality skill
- `plugins/sui-move/commands/move-code-review.md` — triggers move-code-review skill
- `plugins/sui-move/commands/move-tests.md` — triggers move-tests skill

### Scripts
- `plugins/sui-move/scripts/sync-skills.sh` — copies from repo skills/, validates frontmatter, exits non-zero on failure
- `plugins/sui-move/scripts/smoke-test-skills.sh` — asserts bundled skills have non-empty name+description

### Agent
- `plugins/sui-move/agents/sui-move-agent.md` — added step 8 (skill sequence) and explicit coordination rules

### Fixture
- `plugins/sui-move/.claude-plugin/fixtures/compliant-workflow-transcript.md` — Counter example showing full workflow

## Key Decisions

### Shell-only YAML parsing
Both scripts use `awk`/`grep`/`sed` for frontmatter parsing — no `yq` or Python dependency. The tradeoff is limited to extracting inline values; block scalar bodies are detected via the `|` indicator and verified separately. This keeps the scripts dependency-free.

### `|| true` on optional key lookups
`parse_frontmatter_key` fails with exit 1 (via `pipefail`) when the key is absent. Since `set -e` applies to variable assignments in bash, optional keys (like `version`) use `|| true` to prevent spurious exits. Required keys (`name`) check the returned value for emptiness instead.

### Agent prompt structure
Added step 8 as an explicit numbered item in the required workflow (not a separate section) so it reads as part of the same sequential checklist. Added a `Skill coordination rules:` subsection that clarifies when each skill is mandatory vs. conditional.

### Fixture as transcript
The fixture uses a realistic annotated transcript (not pseudocode) to show each workflow step with actual command invocations and output snippets. This makes it testable by a human reviewer without needing to run the agent.

## Verification

All 10 completion criteria verified:
1-3: `diff` confirms byte-for-byte identity of all three SKILL.md files
4-6: YAML frontmatter of all three commands has `name` and `description`
7: `sync-skills.sh` runs clean: `==> Sync complete (3 skills)`
8: `smoke-test-skills.sh` runs clean: `==> Results: 6 passed, 0 failed`
9: Agent contains explicit `/move-code-quality → /move-code-review → /move-tests` ordering
10: Fixture contains all five required workflow phases (doc lookup × 2, implementation, 3 skills)
