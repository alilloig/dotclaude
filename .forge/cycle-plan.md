---
type: cycle-plan
total_cycles: 6
created: 2026-04-13T13:30:00Z
codex_reviewed: true
---

# Cycle Plan

## Cycle 1: Foundation + MCP Vertical Slice
- **Scope**: Plugin manifest with MCP wiring, directory structure, sui-move-agent skeleton, bundled docs snapshot, move_diagnostics end-to-end
- **Dependencies**: None (foundation cycle)
- **Complexity**: Complex
- **Deliverables**:
  - `plugins/sui-move/.claude-plugin/plugin.json` (WITH mcpServers section)
  - `agents/sui-move-agent.md` with full system prompt
  - `commands/sui-move.md`
  - `docs/` directory with synced sui-pilot snapshot
  - `docs/VERSION.json` with framework version range
  - `scripts/sync-sui-pilot-docs.sh`
  - `mcp/move-lsp-mcp/` package scaffolding (package.json, tsconfig.json)
  - `src/index.ts`, `src/server.ts`, `src/lsp-client.ts`, `src/config.ts`, `src/errors.ts`
  - `move_diagnostics` tool handler (file-on-disk mode only)
  - Core error codes: BINARY_NOT_FOUND, NO_WORKSPACE, LSP_START_FAILED
  - Binary discovery logic with version detection
  - Unit tests for config parsing, binary discovery
  - Integration test with real move-analyzer and fixture package
  - Structured logging for analyzer startup and workspace resolution
- **Platform scope**: macOS and Linux; Windows deferred
- **Suggested model**: Opus
- **Exit criteria**: User can install plugin, invoke move_diagnostics via MCP, get real analyzer response

## Cycle 2: Skills + Command Surface
- **Scope**: Copy and bundle existing Move skills, create skill commands, sync script with compatibility contract, refine agent behavior
- **Dependencies**: Cycle 1
- **Complexity**: Simple
- **Deliverables**:
  - `skills/move-code-quality/`, `skills/move-code-review/`, `skills/move-tests/` (copied)
  - `commands/move-code-quality.md`, `commands/move-code-review.md`, `commands/move-tests.md`
  - `scripts/sync-skills.sh` with version validation
  - Post-sync smoke test script
  - Agent prompt refinement with skill coordination
  - Basic compliance fixture: compliant workflow transcript
- **Platform scope**: Platform-agnostic (no binary execution)
- **Suggested model**: Sonnet
- **Exit criteria**: All three skills discoverable and invokable via commands, agent coordinates skill sequence

## Cycle 3: MCP Core Hardening
- **Scope**: Document store, workspace resolution with LRU cache, error model completion, diagnostics correctness
- **Dependencies**: Cycle 1
- **Complexity**: Moderate
- **Deliverables**:
  - `src/document-store.ts` - document sync (didOpen/didChange/didClose)
  - `src/workspace.ts` - workspace root resolution with LRU cache (max 3 roots)
  - Full error taxonomy: LSP_TIMEOUT, LSP_CRASHED, LSP_PROTOCOL_ERROR, SYMBOL_NOT_FOUND
  - Unsaved buffer support for diagnostics (content parameter)
  - Version incompatibility error handling
  - docs/VERSION.json parsing and warning behavior
  - Structured logging for restart attempts, timeout events
  - Unit tests for document store and workspace resolution
  - Integration tests for error paths
- **Platform scope**: macOS and Linux
- **Suggested model**: Opus
- **Exit criteria**: Diagnostics work with unsaved buffers, workspace resolution handles multi-package repos correctly

## Cycle 4: Remaining MCP Tools
- **Scope**: hover, completions, goto-definition tools with fixture coverage
- **Dependencies**: Cycle 3
- **Complexity**: Moderate
- **Deliverables**:
  - `move_hover` tool handler
  - `move_completions` tool handler
  - `move_goto_definition` tool handler
  - `src/tool-handlers.ts` completion
  - Fixture package with expected outputs for all 4 tools
  - Integration tests: hover returns type info, completions return valid candidates, goto-definition navigates
  - Cross-package goto-definition limitation documented
- **Platform scope**: macOS and Linux
- **Suggested model**: Opus
- **Exit criteria**: All 4 MCP tools pass fixture tests with expected outputs

## Cycle 5: Recovery + Degradation
- **Scope**: Crash recovery, restart logic, timeout cleanup, per-workspace fallback mode, error-path tests
- **Dependencies**: Cycle 4
- **Complexity**: Moderate
- **Deliverables**:
  - Crash recovery with configurable restart limit (MOVE_LSP_MAX_RESTARTS)
  - Timeout handling with child process cleanup
  - Restart/recovery sequence: reinitialize, reopen cached documents
  - Per-workspace subprocess fallback mode (if fixture tests show state bleed)
  - Fixture tests for each error path: timeout, crash, malformed JSON-RPC
  - Latency validation against targets (5s cold, 2s warm)
  - Orphan process prevention tests
- **Platform scope**: macOS and Linux; Windows smoke tests begin
- **Suggested model**: Opus
- **Exit criteria**: All error paths return documented codes, restart recovers cleanly, no orphaned processes

## Cycle 6: Integration Closure
- **Scope**: E2E testing, compliance suite, documentation, packaging validation
- **Dependencies**: Cycles 2, 5
- **Complexity**: Moderate
- **Deliverables**:
  - E2E test: agent + docs + skills + MCP full workflow
  - Agent compliance test suite with fixtures:
    - Compliant workflow (doc lookup -> cite -> implement -> quality -> review)
    - Non-compliant detection (code before doc lookup)
    - Command-routing fallback mode validation
  - Installation guide (plugin + move-analyzer)
  - Platform-specific setup (macOS, Linux, Windows experimental)
  - Configuration reference (all env vars, defaults)
  - Usage examples (common workflows)
  - Skill reference
  - Troubleshooting guide
  - Build script validation
  - Artifact layout validation
  - Local launch test via final plugin manifest
  - README.md for plugin
- **Platform scope**: macOS and Linux production; Windows experimental
- **Suggested model**: Opus
- **Exit criteria**: Full E2E workflow completes, compliance tests pass, docs complete

## Dependency Graph

```
Cycle 1 (Foundation + MCP Spike)
    |
    +-- Cycle 2 (Skills + Commands)
    |       |
    |       +-------------------+
    |                           |
    +-- Cycle 3 (MCP Hardening) |
            |                   |
            +-- Cycle 4 (Tools) |
                    |           |
                    +-- Cycle 5 (Recovery)
                            |
                            +-- Cycle 6 (Integration)
                                    ^
                                    |
                            (depends on Cycle 2 for skills)
```

## Risk Mitigation

| Risk | Cycle | Mitigation |
|------|-------|------------|
| move-analyzer behavior unknown | 1 | Early spike with real binary validates assumptions |
| LSP protocol complexity | 1, 3 | Minimal tool surface; recorded fixtures for replay |
| Shared process state bleed | 3, 5 | Fallback architecture for per-workspace subprocess |
| Cross-platform binary issues | 5, 6 | Windows explicitly experimental until validated |
| Skill bundling drift | 2 | Compatibility contract + smoke tests |
| Doc staleness | 1 | VERSION.json with framework version range |
