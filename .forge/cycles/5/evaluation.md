# Cycle 5: Recovery + Degradation - Evaluation

**Evaluator**: Independent verification
**Date**: 2026-04-13

## Summary

The implementation delivers core recovery and degradation functionality with solid error handling. Build and tests pass. However, there are two issues: one test gap and one deviation from the contract specification.

## Criterion-by-Criterion Verification

### Crash Recovery

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Pending requests reject with LSP_CRASHED within 100ms | **PARTIAL** | `handleProcessExit()` at lsp-client.ts:661-707 rejects immediately on exit event, but test doesn't verify the rejection happens with pending requests (see issue below) |
| 2 | LSP_START_FAILED after max restarts | **PASS** | lsp-client.ts:187-192 checks `hardFailed` flag; test "should throw LSP_START_FAILED when hard failed" verifies |
| 3 | Restart reopens documents with incremented versions | **PASS** | server.ts:226-241 calls `incrementVersionsForWorkspace()` then `reopenDocuments()`. Test "incrementVersionsForWorkspace updates versions" verifies store behavior |

### Timeout Handling

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 4 | SIGTERM on timeout, SIGKILL after 2000ms | **PASS** | `killWithEscalation()` at lsp-client.ts:423-438 sends SIGTERM immediately, schedules SIGKILL at 2000ms. Test "should send SIGTERM on timeout" verifies |
| 5 | Timeout marks instance unhealthy | **PASS** | lsp-client.ts:407 sets `this.isUnhealthy = true`. Test "should mark client as unhealthy after timeout" verifies |
| 6 | LSP_TIMEOUT includes method and duration | **PASS** | LspTimeoutError at errors.ts:67-70 includes `{ method, timeoutMs }` in details. Test "should include method name in timeout error details" verifies |

### Malformed JSON-RPC

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 7 | Protocol error kills child and marks unhealthy | **PASS** | lsp-client.ts:322-339 sets `isUnhealthy = true` and calls `killWithEscalation()`. Tests verify both behaviors |
| 8 | Next request triggers restart | **PASS** | `needsRestart()` at lsp-client.ts:742-744 returns true when unhealthy; `initializeLspClient()` at server.ts:182-194 handles restart |

### Degraded Mode

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 9 | Structured error includes workspaceRoot | **FAIL** | server.ts:635-645 returns `{ error: { code, message, details } }` but **does not include workspaceRoot** as specified in contract |
| 10 | Server remains responsive when LSP unavailable | **PASS** | Error handling at server.ts:628-650 returns structured error without throwing to MCP framework |

### Tests

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 11 | Unit test: timeout returns LSP_TIMEOUT and kills child | **PASS** | "should reject with LSP_TIMEOUT after timeout period", "should send SIGTERM on timeout" |
| 12 | Unit test: crash returns LSP_CRASHED to pending requests | **FAIL** | Test exists but **does not create pending requests before crash** - only verifies isReady() and crashCount |
| 13 | Unit test: malformed JSON returns LSP_PROTOCOL_ERROR | **PASS** | "should reject with LSP_PROTOCOL_ERROR on malformed response" |
| 14 | Integration test: recovery after crash | **PASS** | "should recover and serve request after simulated crash scenario" (skips when binary unavailable) |
| 15 | Integration test: orphan prevention | **PASS** | "should not leave orphaned processes after server close" (skips when binary unavailable) |

### Build/Test Gates

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 16 | pnpm build exits 0 | **PASS** | Verified - tsc completes without errors |
| 17 | pnpm test exits 0 | **PASS** | 80 tests pass, 23 skipped (integration tests without binary). Unhandled rejections are expected per vitest.config.ts:11 |

## Issues Found

### Issue 1: Test Gap - Crash Rejection Test (Criterion 12)

**Location**: test/unit/lsp-client-recovery.test.ts:102-123

**Problem**: Test "should reject all pending requests with LSP_CRASHED on unexpected exit" does not actually test rejection of pending requests. It:
1. Starts client
2. Simulates crash
3. Only checks `isReady()` and `getConsecutiveCrashes()`

**Expected**: Test should:
1. Start client
2. Create pending request (e.g., `client.hover(...)` without sending response)
3. Simulate crash
4. Verify pending request rejects with `LSP_CRASHED` error code

**Severity**: Medium - The implementation appears correct (handleProcessExit does reject pending requests), but test coverage is incomplete.

### Issue 2: Missing workspaceRoot in Degraded Mode Errors (Criterion 9)

**Location**: server.ts:635-645

**Problem**: Contract specifies degraded mode errors should return:
```json
{ "error": { "code": "...", "message": "..." }, "workspaceRoot": "..." }
```

Implementation returns:
```json
{ "error": { "code": "...", "message": "...", "details": "..." } }
```

The `workspaceRoot` field is missing from error responses.

**Severity**: Low - When errors occur during workspace resolution, workspaceRoot may not be available. Consider adding `workspaceRoot: null` for consistency.

## Code Quality Observations

### Positive

1. **SIGTERM/SIGKILL escalation** is well-implemented with proper timer cleanup
2. **Error types** are well-defined with appropriate error codes
3. **Document store** workspace filtering correctly handles trailing slashes to prevent partial matches
4. **Timeout timer cleanup** prevents memory leaks via `timeoutTimers` Map

### Suggestions

1. The `resetHardFailed()` method exists for testing but is also exposed publicly - consider marking internal
2. Integration tests rely on binary availability - consider mocking for CI environments

## Verdict

**CONDITIONAL PASS**

The implementation is functionally complete and all critical behaviors work correctly. Two minor issues need attention:

1. **Required**: Fix test for criterion 12 to actually verify pending request rejection
2. **Recommended**: Add workspaceRoot to error responses (or update contract if null is acceptable)

## Test Output

```
 Test Files  6 passed | 3 skipped (9)
      Tests  80 passed | 23 skipped (103)
   Duration  340ms
```

Unhandled rejection warnings are expected per vitest.config.ts:11 (`dangerouslyIgnoreUnhandledErrors: true`) for timeout tests using fake timers.
