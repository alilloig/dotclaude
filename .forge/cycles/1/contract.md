---
cycle: 1
name: Foundation + MCP Vertical Slice
---

## Scope

Establish the sui-move plugin foundation with directory structure, plugin manifest with MCP wiring, sui-move-agent with full system prompt, bundled docs snapshot from sui-pilot, and the move_diagnostics MCP tool working end-to-end. This cycle delivers a minimally functional plugin where a user can install it, invoke move_diagnostics via MCP, and get real analyzer responses.

## Completion Criteria

### Plugin Structure (1-6)

1. [ ] `plugins/sui-move/.claude-plugin/plugin.json` exists with valid JSON containing: name, version, description, author, keywords, commands array, skills path, agents array, and mcpServers object with move-lsp entry pointing to `${CLAUDE_PLUGIN_ROOT}/mcp/move-lsp-mcp/dist/index.js`
2. [ ] `plugins/sui-move/agents/sui-move-agent.md` exists with YAML frontmatter (name: sui-move-agent, description, tools list including mcp__move-lsp__move_diagnostics, model: opus, color: blue) and full system prompt matching spec section 4
3. [ ] `plugins/sui-move/commands/sui-move.md` exists with command metadata and instructions that route user to sui-move-agent
4. [ ] `plugins/sui-move/docs/` contains: CLAUDE.md, AGENTS.md, .sui-docs/, .walrus-docs/, .seal-docs/ directories copied from sui-pilot
5. [ ] `plugins/sui-move/docs/VERSION.json` exists with JSON containing: sourceCommit (git SHA of sui-pilot), syncTimestamp (ISO 8601), and suiFrameworkVersion (string range)
6. [ ] `plugins/sui-move/scripts/sync-sui-pilot-docs.sh` exists, is executable, and when run copies docs from sui-pilot source to plugin docs directory

### MCP Package Structure (7-9)

7. [ ] `plugins/sui-move/mcp/move-lsp-mcp/package.json` exists with dependencies: @modelcontextprotocol/sdk, vscode-languageserver-protocol; devDependencies: typescript, vitest, @types/node
8. [ ] `plugins/sui-move/mcp/move-lsp-mcp/tsconfig.json` exists with strict mode enabled and outDir set to dist
9. [ ] `pnpm install && pnpm build` succeeds in mcp/move-lsp-mcp/ directory

### MCP Source Files (10-15)

10. [ ] `src/index.ts` exists as entrypoint that imports and starts the MCP server
11. [ ] `src/server.ts` exists and registers `move_diagnostics` tool with MCP SDK using input schema matching spec (filePath required, content optional, scope optional)
12. [ ] `src/lsp-client.ts` exists with: spawn/kill functions for move-analyzer, initialize/shutdown LSP handshake, didOpen/didChange document sync
13. [ ] `src/config.ts` exists and exports parsed config from env vars: MOVE_ANALYZER_PATH (string), MOVE_LSP_TIMEOUT_MS (number, default 10000), MOVE_LSP_LOG_LEVEL (string, default "info"), MOVE_LSP_MAX_RESTARTS (number, default 3)
14. [ ] `src/errors.ts` exists and exports error codes as constants: BINARY_NOT_FOUND, NO_WORKSPACE, LSP_START_FAILED (at minimum)

### Binary Discovery (15-17)

15. [ ] Binary discovery function exists that checks: (1) MOVE_ANALYZER_PATH env, (2) `which move-analyzer` on PATH, returns path or throws BINARY_NOT_FOUND
16. [ ] On startup, `move-analyzer --version` is executed and result logged in JSON format with fields: event, level, version
17. [ ] Structured logging uses JSON format with at minimum: event, level, timestamp, message fields

### Tests (18-21)

18. [ ] `test/unit/config.test.ts` exists with tests verifying: env parsing defaults, env parsing overrides, invalid value handling
19. [ ] `test/unit/binary-discovery.test.ts` exists with tests verifying: PATH lookup success, BINARY_NOT_FOUND on missing binary
20. [ ] `test/fixtures/simple-package/` exists with valid Move.toml and sources/example.move file
21. [ ] `test/integration/diagnostics.test.ts` exists and when move-analyzer is available: calls move_diagnostics, verifies response has workspaceRoot (string) and diagnostics (array) fields

### End-to-End (22)

22. [ ] `pnpm test` passes in mcp/move-lsp-mcp/ (unit tests always, integration tests conditional on move-analyzer availability)

## Verification Commands

```bash
# Structure verification
cat plugins/sui-move/.claude-plugin/plugin.json | jq .
head -20 plugins/sui-move/agents/sui-move-agent.md
ls plugins/sui-move/docs/
cat plugins/sui-move/docs/VERSION.json | jq .
test -x plugins/sui-move/scripts/sync-sui-pilot-docs.sh && echo "Script executable"

# Build verification
cd plugins/sui-move/mcp/move-lsp-mcp && pnpm install && pnpm build

# Test verification
cd plugins/sui-move/mcp/move-lsp-mcp && pnpm test

# Integration (requires move-analyzer installed)
which move-analyzer && cd plugins/sui-move/mcp/move-lsp-mcp && pnpm test:integration
```

## Context from Previous Cycles

No prior cycles. This is the foundation cycle.

## Notes

- Platform scope: macOS and Linux. Windows support deferred.
- Integration tests should skip gracefully if move-analyzer is not installed.
- The move_diagnostics tool implements file-on-disk mode only (reads from filePath, ignores content parameter for now).
- Logging goes to stderr in JSON format.
