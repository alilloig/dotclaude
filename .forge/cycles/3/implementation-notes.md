# Cycle 3: MCP Core Hardening - Implementation Notes

## Summary

Implemented core infrastructure components for the Move LSP MCP server: document store, workspace resolution with LRU caching, extended error taxonomy, version compatibility checking, and structured logging.

## Components Implemented

### 1. Document Store (`src/document-store.ts`)

Implements LSP text document synchronization protocol subset:
- `didOpen(uri, content, version)` - tracks newly opened documents
- `didChange(uri, content, version)` - updates content and version
- `didClose(uri)` - removes document from tracking
- `get(uri)` - retrieves stored document or undefined

Design decision: Handles `didChange` without prior `didOpen` gracefully by storing the document anyway. This makes the store more resilient to edge cases.

### 2. Workspace Resolution (`src/workspace.ts`)

`WorkspaceResolver` with LRU cache:
- `resolve(filePath)` - finds workspace root (directory containing Move.toml)
- LRU cache with max 3 entries (configurable via constructor)
- `getCacheStats()` - returns `{ hits, misses, size }`

Cache key is the fully resolved file path. Eviction uses access counter to track recency.

### 3. Error Taxonomy (`src/errors.ts`)

Added error codes:
- `LSP_CRASHED` - LSP server crashed unexpectedly
- `LSP_PROTOCOL_ERROR` - LSP protocol violation
- `SYMBOL_NOT_FOUND` - requested symbol not found

Added error classes extending `MoveLspError`:
- `LspTimeoutError(method, timeoutMs)` - with method and timeout in details
- `LspCrashedError(exitCode, signal)` - with exit info in details
- `LspProtocolError(message, details)` - generic protocol error
- `SymbolNotFoundError(symbol, location?)` - with symbol and location in details

### 4. Version Compatibility (`src/version.ts`)

- `checkVersionCompatibility(versionJsonPath)` - compares VERSION.json's `pluginVersion` against server package version
- Returns `{ compatible: boolean, warning?: string }`
- Logs `version_incompatibility` event when mismatch detected

### 5. VERSION.json Schema

Updated `plugins/sui-move/docs/VERSION.json` to match contract schema:
```json
{
  "pluginVersion": "0.1.0",
  "suiPilotRevision": "...",
  "syncTimestamp": "..."
}
```

### 6. Structured Logging

Added logging events to `lsp-client.ts`:
- `lsp_restart_attempt` with `{ restartCount, reason }` - on crash recovery
- `lsp_timeout` with `{ method, timeoutMs }` - on request timeout

Added logging events to `workspace.ts`:
- `workspace_cache_hit` with `{ filePath, workspaceRoot }` - on cache hit
- `workspace_cache_miss` with `{ filePath, workspaceRoot }` - on cache miss

### 7. Server Integration

Updated `server.ts`:
- Replaced inline `findWorkspaceRoot()` with `WorkspaceResolver` instance
- Workspace resolution now uses cached resolver for better performance

## Tests

Created unit tests:
- `test/unit/document-store.test.ts` - 9 tests covering open/change/close/get operations
- `test/unit/workspace.test.ts` - 9 tests covering resolution, cache behavior, LRU eviction
- `test/unit/errors.test.ts` - 21 tests covering all error classes and codes

All 58 tests pass. Integration tests skip gracefully when move-analyzer unavailable.

## Contract Criteria Status

| # | Criterion | Status |
|---|-----------|--------|
| 1 | DocumentStore.didOpen | ✅ |
| 2 | DocumentStore.didChange | ✅ |
| 3 | DocumentStore.didClose | ✅ |
| 4 | DocumentStore.get | ✅ |
| 5 | DocumentStore unit tests | ✅ |
| 6 | WorkspaceResolver.resolve | ✅ |
| 7 | LRU cache max 3 entries | ✅ |
| 8 | getCacheStats | ✅ |
| 9 | Workspace unit tests | ✅ |
| 10 | Error codes exported | ✅ |
| 11 | Error classes extend MoveLspError | ✅ |
| 12 | Error code properties match constants | ✅ |
| 13 | Unsaved buffer support | ✅ (already implemented in Cycle 1) |
| 14 | File existence check for content param | ✅ (already implemented) |
| 15 | VERSION.json schema | ✅ |
| 16 | checkVersionCompatibility | ✅ |
| 17 | Version mismatch returns warning | ✅ |
| 18 | version_incompatibility logging | ✅ |
| 19 | lsp_restart_attempt logging | ✅ |
| 20 | lsp_timeout logging | ✅ |
| 21 | workspace_cache_hit logging | ✅ |
| 22 | workspace_cache_miss logging | ✅ |
| 23 | pnpm test exits 0 | ✅ |
| 24 | Integration tests skip gracefully | ✅ |

## Files Changed

- **Created:**
  - `src/document-store.ts`
  - `src/workspace.ts`
  - `src/version.ts`
  - `test/unit/document-store.test.ts`
  - `test/unit/workspace.test.ts`
  - `test/unit/errors.test.ts`

- **Modified:**
  - `src/errors.ts` - added new error codes and classes
  - `src/lsp-client.ts` - added structured logging, use LspTimeoutError
  - `src/server.ts` - use WorkspaceResolver instead of inline function
  - `plugins/sui-move/docs/VERSION.json` - updated schema
