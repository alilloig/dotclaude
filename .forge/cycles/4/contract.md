---
cycle: 4
name: Remaining MCP Tools
---

## Scope

Implement the three remaining MCP tools for move-analyzer integration: `move_hover`, `move_completions`, and `move_goto_definition`. Each tool sends the corresponding LSP request to move-analyzer and returns normalized JSON responses. Includes fixture package with test targets for all 4 MCP tools and integration tests verifying expected outputs.

## Completion Criteria

### Tool Registration (server.ts)

1. [ ] `move_hover` tool registered with input schema: `{ filePath: string (required), line: number (0-based, required), character: number (0-based, required), content?: string }`
2. [ ] `move_completions` tool registered with input schema: `{ filePath: string (required), line: number (0-based, required), character: number (0-based, required), content?: string }`
3. [ ] `move_goto_definition` tool registered with input schema: `{ filePath: string (required), line: number (0-based, required), character: number (0-based, required), content?: string }`
4. [ ] All 4 tools (move_diagnostics, move_hover, move_completions, move_goto_definition) returned by ListToolsRequestSchema handler

### Response Schemas

5. [ ] `move_hover` success response: `{ workspaceRoot: string, contents: string | null }` where contents is markdown hover text or null if no hover info
6. [ ] `move_hover` error response for invalid symbol: `{ error: { code: "SYMBOL_NOT_FOUND", message: string } }`
7. [ ] `move_completions` success response: `{ workspaceRoot: string, completions: Array<{ label: string, kind: string, detail?: string }> }` where kind is normalized string ("function", "struct", "field", "module", "keyword", "variable", "constant", "unknown")
8. [ ] `move_completions` returns empty array `{ completions: [] }` when no candidates available (not an error)
9. [ ] `move_goto_definition` success response: `{ workspaceRoot: string, locations: Array<{ filePath: string, line: number, character: number }> }` where line/character are 0-based
10. [ ] `move_goto_definition` error response for unresolved symbol: `{ error: { code: "SYMBOL_NOT_FOUND", message: string } }`

### LSP Client Extension

11. [ ] `lsp-client.ts` has `hover(uri: string, line: number, character: number): Promise<HoverResult | null>` method
12. [ ] `lsp-client.ts` has `completion(uri: string, line: number, character: number): Promise<CompletionResult>` method
13. [ ] `lsp-client.ts` has `gotoDefinition(uri: string, line: number, character: number): Promise<LocationResult[]>` method

### Content Parameter Behavior

14. [ ] When `content` is provided, tool uses it via document store (didOpen/didChange) without reading from disk
15. [ ] When `content` is omitted, tool reads file content from disk

### Fixture Package

16. [ ] Fixture package at `test/fixtures/lsp-test-package/` with `Move.toml` and `sources/main.move`
17. [ ] `sources/main.move` contains: (a) struct `TestStruct` with field `value: u64`, (b) function `test_function` that creates TestStruct, (c) constant `TEST_CONST: u64`, (d) import of `sui::object`

### Integration Tests

18. [ ] Integration test: hover at struct name position returns contents containing "TestStruct"
19. [ ] Integration test: completions inside function body returns non-empty array
20. [ ] Integration test: goto-definition on `TestStruct` usage returns location pointing to struct definition line
21. [ ] Integration test: goto-definition on non-existent symbol returns SYMBOL_NOT_FOUND error
22. [ ] Integration test: hover on non-existent position returns null contents (not error)
23. [ ] Existing move_diagnostics tests continue to pass against fixture packages

### Documentation

24. [ ] Comment in `src/server.ts` or `src/lsp-client.ts` states: "Cross-package goto-definition may not resolve due to move-analyzer limitations on multi-package workspaces"

### Build and Test

25. [ ] `npm run build` exits 0
26. [ ] `npm test` exits 0

## Verification Commands
- `cd /Users/alilloig/workspace/claudefiles/plugins/sui-move/mcp/move-lsp-mcp && npm run build` — verifies criterion 25
- `cd /Users/alilloig/workspace/claudefiles/plugins/sui-move/mcp/move-lsp-mcp && npm test` — verifies criteria 18-23, 26
- `grep -c "move_hover\|move_completions\|move_goto_definition" src/server.ts` — verifies criteria 1-4 (should return 3+)
- `grep -c "hover\|completion\|gotoDefinition" src/lsp-client.ts` — verifies criteria 11-13

## Context from Previous Cycles

**Cycle 1**: MCP server foundation with move_diagnostics tool, LSP client, binary discovery
**Cycle 2**: Bundled skills (move-code-quality, move-code-review, move-tests) and slash commands
**Cycle 3**: Document store for LSP text sync, workspace resolver with LRU cache, error taxonomy, VERSION.json compatibility

Existing infrastructure:
- `src/lsp-client.ts`: MoveLspClient with didOpen, didChange, getDiagnostics methods
- `src/server.ts`: createServer() with move_diagnostics handler pattern
- `src/errors.ts`: Error classes including SymbolNotFoundError
- `test/fixtures/simple-package/`: Valid Move package for integration tests
