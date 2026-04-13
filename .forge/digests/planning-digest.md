---
type: planning-digest
total_cycles: 6
codex_thread_id_spec_critique: "019d866d-49a5-76a3-902f-7b31aac1509e"
---

## Project Summary

Building the sui-move Claude Code plugin that transforms Claude into a Sui/Move development expert. Four core components: (1) sui-move-agent enforcing doc-first workflow with bundled sui-pilot docs, (2) move-lsp-mcp server wrapping move-analyzer via MCP tools, (3) bundled Move skills (quality, security review, tests), (4) integrated documentation access. Plugin uses soft-enforcement for doc-first workflow (auditable compliance, not hard prevention). MCP server uses singleton subprocess model with per-workspace fallback if needed. Target: production-grade on macOS/Linux, Windows experimental.

## Feature List

1. **sui-move-agent** - Specialized agent with doc-first workflow, skill coordination
2. **move_diagnostics** - MCP tool for compiler diagnostics (file/package scope)
3. **move_hover** - MCP tool for type info at position
4. **move_completions** - MCP tool for code completions
5. **move_goto_definition** - MCP tool for definition navigation
6. **Bundled skills** - move-code-quality, move-code-review, move-tests (copied)
7. **Bundled docs** - sui-pilot snapshot with VERSION.json versioning
8. **Binary discovery** - MOVE_ANALYZER_PATH, PATH, version validation
9. **Error recovery** - Crash restart, timeout handling, graceful degradation

## Cycle Overview

| Cycle | Name | Complexity | Dependencies |
|-------|------|-----------|-------------|
| 1 | Foundation + MCP Spike | Complex | None |
| 2 | Skills + Commands | Simple | 1 |
| 3 | MCP Core Hardening | Moderate | 1 |
| 4 | Remaining MCP Tools | Moderate | 3 |
| 5 | Recovery + Degradation | Moderate | 4 |
| 6 | Integration Closure | Moderate | 2, 5 |
