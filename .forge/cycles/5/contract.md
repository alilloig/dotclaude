---
cycle: 5
name: Recovery + Degradation
---

## Scope

Implement crash recovery, restart logic, timeout cleanup with child process termination, and per-workspace fallback mode. Add comprehensive error-path tests for timeout, crash, and malformed JSON-RPC scenarios. Ensure no orphaned processes and validate latency targets.

## Completion Criteria

### Crash Recovery

1. [ ] On child process unexpected exit: all pending requests reject with error code `LSP_CRASHED` within 100ms
2. [ ] LSP client tracks restart count; after `MOVE_LSP_MAX_RESTARTS` (default 3) consecutive crashes without success, subsequent requests fail with `LSP_START_FAILED` instead of retry
3. [ ] On restart: client reinitializes LSP and reopens all documents for the active workspace from DocumentStore with preserved content and incremented versions before serving the next request

### Timeout Handling

4. [ ] On request timeout: client sends `SIGTERM` to child process; if child still alive after 2000ms, sends `SIGKILL`
5. [ ] After timeout: LSP instance marked unhealthy (isReady() returns false); next request triggers automatic restart
6. [ ] Timeout error returns `LSP_TIMEOUT` error code with method name and timeout duration in details

### Malformed JSON-RPC

7. [ ] On malformed JSON-RPC response: client emits `LSP_PROTOCOL_ERROR`, kills child, and marks instance unhealthy
8. [ ] Next request after protocol error triggers restart attempt

### Degraded Mode

9. [ ] When LSP unavailable (binary missing, max restarts exceeded), tools return structured error `{ error: { code, message }, workspaceRoot }` within 500ms, never hang
10. [ ] Server process remains responsive; non-LSP operations continue to work

### Tests

11. [ ] Unit test: timeout error path returns `LSP_TIMEOUT` and kills child process
12. [ ] Unit test: crash error path returns `LSP_CRASHED` to all pending requests
13. [ ] Unit test: malformed JSON-RPC returns `LSP_PROTOCOL_ERROR` and restarts child
14. [ ] Integration test: after simulated crash, restart recovers and serves subsequent request successfully
15. [ ] Integration test: orphan prevention - spawned child PIDs are tracked and verified terminated after test cleanup

### Build/Test Gates

16. [ ] `pnpm build` exits 0
17. [ ] `pnpm test` exits 0

## Verification Commands

- `cd /Users/alilloig/workspace/claudefiles/plugins/sui-move/mcp/move-lsp-mcp && pnpm build` -- verifies criterion 16
- `cd /Users/alilloig/workspace/claudefiles/plugins/sui-move/mcp/move-lsp-mcp && pnpm test` -- verifies criteria 11-15, 17
- `grep -r "killChild\|SIGTERM\|SIGKILL" src/` -- behavioral verification for criterion 4
- `grep -r "reopenDocuments\|replayDocuments" src/` -- behavioral verification for criterion 3
- `grep -rn "isReady\|unhealthy" src/lsp-client.ts` -- state management for criteria 5, 7

## Context from Previous Cycles

- **Cycle 1**: Plugin foundation with MCP server, move_diagnostics tool, LSP client basic lifecycle
- **Cycle 2**: Bundled skills with slash commands
- **Cycle 3**: DocumentStore for text sync, WorkspaceResolver with LRU cache, error taxonomy in errors.ts, VERSION.json compatibility, MOVE_LSP_MAX_RESTARTS config
- **Cycle 4**: Implemented move_hover, move_completions, move_goto_definition tools. Integration tests in test/integration/. lsp-test-package fixture available at test/fixtures/lsp-test-package/
