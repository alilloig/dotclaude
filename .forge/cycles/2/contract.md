---
cycle: 2
name: Skills + Command Surface
---

## Scope

Copy and bundle the three existing Move skills (`move-code-quality`, `move-code-review`, `move-tests`) into the sui-move plugin, create corresponding slash commands, implement a sync script with version validation, create a post-sync smoke test script, refine the agent prompt to coordinate skill sequences, and create a basic compliance fixture demonstrating the workflow.

## Completion Criteria

1. [ ] `plugins/sui-move/skills/move-code-quality/SKILL.md` exists and is byte-for-byte identical to `skills/move-code-quality/SKILL.md`
2. [ ] `plugins/sui-move/skills/move-code-review/SKILL.md` exists and is byte-for-byte identical to `skills/move-code-review/SKILL.md`
3. [ ] `plugins/sui-move/skills/move-tests/SKILL.md` exists and is byte-for-byte identical to `skills/move-tests/SKILL.md`
4. [ ] `plugins/sui-move/commands/move-code-quality.md` exists with YAML frontmatter containing `name: move-code-quality` and non-empty `description`
5. [ ] `plugins/sui-move/commands/move-code-review.md` exists with YAML frontmatter containing `name: move-code-review` and non-empty `description`
6. [ ] `plugins/sui-move/commands/move-tests.md` exists with YAML frontmatter containing `name: move-tests` and non-empty `description`
7. [ ] `plugins/sui-move/scripts/sync-skills.sh` exists, is executable, copies the three source SKILL.md files to plugin skills directories, parses YAML frontmatter, and exits non-zero on copy failure
8. [ ] `plugins/sui-move/scripts/smoke-test-skills.sh` exists, is executable, parses frontmatter of each bundled skill, asserts `name` and `description` are non-empty strings, and exits non-zero on any failure
9. [ ] `plugins/sui-move/agents/sui-move-agent.md` contains explicit ordered skill coordination instructions: after implementation invoke `/move-code-quality`, then `/move-code-review`, then `/move-tests` if tests are missing or requested
10. [ ] `plugins/sui-move/.claude-plugin/fixtures/compliant-workflow-transcript.md` exists and contains transcript showing: (a) doc lookup in `docs/CLAUDE.md` and `docs/AGENTS.md` before code, (b) code implementation, (c) `/move-code-quality` invocation, (d) `/move-code-review` invocation, (e) `/move-tests` invocation when tests are absent

## Verification Commands

- `cmp -s plugins/sui-move/skills/move-code-quality/SKILL.md skills/move-code-quality/SKILL.md && cmp -s plugins/sui-move/skills/move-code-review/SKILL.md skills/move-code-review/SKILL.md && cmp -s plugins/sui-move/skills/move-tests/SKILL.md skills/move-tests/SKILL.md` — verifies criteria 1, 2, 3
- `grep -q 'name: move-code-quality' plugins/sui-move/commands/move-code-quality.md && grep -q 'description:' plugins/sui-move/commands/move-code-quality.md` — verifies criterion 4
- `grep -q 'name: move-code-review' plugins/sui-move/commands/move-code-review.md && grep -q 'description:' plugins/sui-move/commands/move-code-review.md` — verifies criterion 5
- `grep -q 'name: move-tests' plugins/sui-move/commands/move-tests.md && grep -q 'description:' plugins/sui-move/commands/move-tests.md` — verifies criterion 6
- `test -x plugins/sui-move/scripts/sync-skills.sh && bash plugins/sui-move/scripts/sync-skills.sh` — verifies criterion 7
- `test -x plugins/sui-move/scripts/smoke-test-skills.sh && bash plugins/sui-move/scripts/smoke-test-skills.sh` — verifies criterion 8
- `grep -E '/move-code-quality.*then.*/move-code-review|/move-code-quality.*\n.*\n.*/move-code-review' plugins/sui-move/agents/sui-move-agent.md || grep -A5 'move-code-quality' plugins/sui-move/agents/sui-move-agent.md | grep -q 'move-code-review'` — verifies criterion 9 (ordered sequence)
- `grep -q 'docs/CLAUDE.md\|docs/AGENTS.md' plugins/sui-move/.claude-plugin/fixtures/compliant-workflow-transcript.md && grep -q '/move-code-quality' plugins/sui-move/.claude-plugin/fixtures/compliant-workflow-transcript.md && grep -q '/move-code-review' plugins/sui-move/.claude-plugin/fixtures/compliant-workflow-transcript.md` — verifies criterion 10

## Context from Previous Cycles

### Cycle 1: Foundation + MCP Vertical Slice
- Created plugin foundation: manifest, agent, `/sui-move` command, bundled docs, MCP server with `move_diagnostics` tool
- Agent already enforces doc-first workflow with plugin-local doc paths
- Files exist: `plugins/sui-move/agents/sui-move-agent.md`, `plugins/sui-move/commands/sui-move.md`, `plugins/sui-move/docs/` with bundled sui-pilot snapshot
- MCP server at `plugins/sui-move/mcp/move-lsp-mcp/` with working `move_diagnostics` tool
- Agent prompt uses `${CLAUDE_PLUGIN_ROOT}` variable for doc paths
