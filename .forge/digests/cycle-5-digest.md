---
type: cycle-digest
cycle: 5
name: "Recovery + Degradation"
verdict: PASS
iterations: 3
codex_quality_rating: 4
---

## What Was Built

Crash recovery with restart limits, SIGTERM/SIGKILL timeout escalation, workspace-aware LSP. Documents reopen with versions after restart.

## Files Changed

- `src/lsp-client.ts` — crash recovery, timeout escalation
- `src/server.ts` — restart recovery, workspace switching
- `src/document-store.ts` — workspace filtering
- `test/unit/lsp-client-recovery.test.ts` — 13 tests

## Concerns

None.
