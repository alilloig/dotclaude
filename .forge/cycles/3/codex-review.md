# Codex Review - Cycle 3: MCP Core Hardening

## Iteration 1 Review

**Verdict**: FAIL (despite evaluator PASS)
**Quality Rating**: 2/5

## Critical Issues Found (Iteration 1)

### 1. DocumentStore Not Integrated

`DocumentStore` is implemented and unit-tested but NOT used in `server.ts`. The diagnostics flow always calls `lspClient.didOpen()` directly. Repeated diagnostics requests for the same URI issue `didOpen` with version `1` instead of using `didChange`.

**Impact**: The document tracking scope is not realized in the main path.

### 2. Workspace Cache Keys Files, Not Roots

The cache is keyed by `resolvedPath` (file path), not workspace root. Multiple files from the same workspace each consume a cache slot. The unit test codifies this incorrect behavior.

**Contract says**: "LRU cache with max 3 roots"
**Implementation does**: "LRU cache with max 3 file paths"

### 3. VERSION.json Checking is Dead Code

`checkVersionCompatibility` is defined but never called. No call sites in `src/`, no tests. The function is isolated and unused.

### 4. New Error Classes Not Wired

`LspCrashedError`, `LspProtocolError`, `SymbolNotFoundError` are exported but never imported/used by `lsp-client.ts`. On process exit, a generic `Error('LSP process exited')` is thrown instead of `LspCrashedError`.

### 5. Integration Tests Never Run

In `diagnostics.test.ts`, `binaryAvailable` starts as `false` and `test.runIf(binaryAvailable)` is evaluated at definition time (before `beforeAll` runs). All integration tests are pre-skipped.

## Required Fixes

1. **Integrate DocumentStore into server.ts**: Track opened documents, use `didChange` for re-opened URIs
2. **Fix workspace cache key**: Cache by workspace root, not file path
3. **Call checkVersionCompatibility at startup**: Log warning if mismatch
4. **Use new error classes**: `LspCrashedError` on process exit, `LspProtocolError` on JSON parse failure
5. **Fix integration test gating**: Use async skip logic or move binary check outside test.runIf

## Concerns for Subsequent Cycles

- Test suite gives false confidence; fix before adding more features
- Clarify cache semantics in spec (file vs root)
- Dead code accumulation is a risk pattern

---

## Iteration 2 Review

**Verdict**: PASS
**Quality Rating**: 4/5

All 5 issues from Iteration 1 have been addressed:

1. **DocumentStore integrated**: server.ts uses DocumentStore with proper didOpen/didChange switching
2. **Workspace cache by root**: Fixed to cache workspace roots, not file paths
3. **Version check called**: checkVersionCompatibility called in initializeBinaryOnStartup()
4. **Error classes wired**: LspCrashedError and LspProtocolError thrown at runtime
5. **Integration tests fixed**: Synchronous binary check before test.runIf() evaluation

The implementation is now production-ready for its stated scope.
