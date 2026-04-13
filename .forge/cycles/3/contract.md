---
cycle: 3
name: MCP Core Hardening
---

## Scope

Complete the MCP server's core infrastructure: document store for tracking open/changed/closed documents, workspace resolution with LRU caching, full error taxonomy, unsaved buffer support for diagnostics, and VERSION.json parsing for compatibility warnings.

## Completion Criteria

### Document Store (`src/document-store.ts`)

1. [ ] `DocumentStore` class exports `didOpen(uri, content, version)` that stores document state
2. [ ] `DocumentStore.didChange(uri, content, version)` updates stored content and version
3. [ ] `DocumentStore.didClose(uri)` removes document from store
4. [ ] `DocumentStore.get(uri)` returns stored document or undefined
5. [ ] Unit test `test/unit/document-store.test.ts` verifies: open stores, change updates, close removes, get returns undefined for unknown URI

### Workspace Resolution (`src/workspace.ts`)

6. [ ] `WorkspaceResolver` class with `resolve(filePath): string` that returns workspace root (directory containing Move.toml)
7. [ ] LRU cache with max 3 entries: 4th distinct workspace evicts least-recently-used entry
8. [ ] `getCacheStats()` returns `{ hits: number, misses: number, size: number }`
9. [ ] Unit test `test/unit/workspace.test.ts` verifies: resolution finds Move.toml, cache hit increments hits, cache miss increments misses, 4th entry evicts LRU entry

### Error Taxonomy (`src/errors.ts`)

10. [ ] Error codes exported: `LSP_TIMEOUT`, `LSP_CRASHED`, `LSP_PROTOCOL_ERROR`, `SYMBOL_NOT_FOUND`
11. [ ] Error classes exported: `LspTimeoutError`, `LspCrashedError`, `LspProtocolError`, `SymbolNotFoundError` — all extend `MoveLspError`
12. [ ] Each error class sets appropriate `code` property matching its error code constant

### Unsaved Buffer Support

13. [ ] `move_diagnostics` tool: when `content` parameter is provided, diagnostics run against that content (not file on disk)
14. [ ] If `content` is provided, file existence on disk is not required (only workspace must exist)

### VERSION.json Compatibility

15. [ ] File `plugins/sui-move/docs/VERSION.json` exists with schema: `{ pluginVersion: string, suiPilotRevision: string, syncTimestamp: string }`
16. [ ] `src/version.ts` exports `checkVersionCompatibility(versionJsonPath): { compatible: boolean, warning?: string }`
17. [ ] If `pluginVersion` does not match server package version, returns `{ compatible: false, warning: "..." }`
18. [ ] Warning is logged via structured logger with event `version_incompatibility` when detected

### Structured Logging

19. [ ] Restart attempt logs event `lsp_restart_attempt` with `{ restartCount: number, reason: string }`
20. [ ] Timeout logs event `lsp_timeout` with `{ method: string, timeoutMs: number }`
21. [ ] Workspace cache hit logs event `workspace_cache_hit` with `{ filePath: string, workspaceRoot: string }`
22. [ ] Workspace cache miss logs event `workspace_cache_miss` with `{ filePath: string, workspaceRoot: string }`

### Tests Pass

23. [ ] `pnpm test` exits 0 — includes unit tests for document-store, workspace, and errors
24. [ ] Integration tests in `test/integration/` skip gracefully (via `test.runIf`) when move-analyzer binary unavailable

## Verification Commands

```bash
# All tests pass
cd /Users/alilloig/workspace/claudefiles/plugins/sui-move/mcp/move-lsp-mcp && pnpm test

# Document store exists with required methods
grep -E "didOpen|didChange|didClose|get\(" src/document-store.ts

# Workspace resolver with LRU
grep -E "maxRoots|cache|LRU|getCacheStats" src/workspace.ts

# Error codes and classes
grep -E "LSP_TIMEOUT|LSP_CRASHED|LSP_PROTOCOL_ERROR|SYMBOL_NOT_FOUND" src/errors.ts
grep -E "LspTimeoutError|LspCrashedError|LspProtocolError|SymbolNotFoundError" src/errors.ts

# Version checking
grep -E "checkVersionCompatibility|version_incompatibility" src/version.ts

# Structured logging events
grep -E "lsp_restart_attempt|lsp_timeout|workspace_cache_hit|workspace_cache_miss" src/*.ts

# VERSION.json exists
cat plugins/sui-move/docs/VERSION.json
```

## Context from Previous Cycles

### Cycle 1: Foundation + MCP Vertical Slice
- MCP server skeleton at `plugins/sui-move/mcp/move-lsp-mcp/`
- `move_diagnostics` tool wired to move-analyzer LSP
- Existing files: `server.ts`, `lsp-client.ts`, `errors.ts`, `config.ts`, `logger.ts`, `binary-discovery.ts`
- Workspace root resolution exists inline in `server.ts` (needs extraction to workspace.ts)
- Unit tests exist for config and binary-discovery

### Cycle 2: Skills + Command Surface
- Bundled skills and commands (not relevant to this cycle)
- `plugins/sui-move/docs/` directory exists for doc snapshots
