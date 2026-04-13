---
cycle: 4
name: Remaining MCP Tools
---

## Implementation Summary

Implemented three new MCP tools for move-analyzer integration: `move_hover`, `move_completions`, and `move_goto_definition`. Each tool follows the same pattern as the existing `move_diagnostics` tool.

## Changes Made

### src/lsp-client.ts

1. **Added imports**: `Hover`, `CompletionItem`, `CompletionItemKind`, `Location`, `LocationLink` from vscode-languageserver-protocol

2. **Added type exports**:
   - `HoverResult`: Contains `contents: string`
   - `CompletionResult`: Contains array of `{ label, kind, detail? }`
   - `LocationResult`: Contains `{ filePath, line, character }` (0-based)

3. **Added helper function**: `completionKindToString()` - Maps LSP numeric CompletionItemKind to normalized strings ("function", "struct", "field", "module", "keyword", "variable", "constant", "unknown")

4. **Added methods to MoveLspClient**:
   - `hover(uri, line, character)`: Sends `textDocument/hover`, normalizes MarkupContent responses to string
   - `completion(uri, line, character)`: Sends `textDocument/completion`, handles both array and CompletionList formats
   - `gotoDefinition(uri, line, character)`: Sends `textDocument/definition`, handles both Location and LocationLink formats

### src/server.ts

1. **Added response interfaces**: `HoverResponse`, `CompletionsResponse`, `GotoDefinitionResponse`

2. **Added helper function**: `prepareDocument()` - Shared logic for document sync (didOpen/didChange) extracted from handleMoveDiagnostics

3. **Added tool handlers**:
   - `handleMoveHover()`: Returns `{ workspaceRoot, contents }` where contents is string or null
   - `handleMoveCompletions()`: Returns `{ workspaceRoot, completions[] }` - always returns array, never error for empty
   - `handleMoveGotoDefinition()`: Returns `{ workspaceRoot, locations[] }` or throws SymbolNotFoundError if empty

4. **Updated ListToolsRequestSchema handler**: Now lists all 4 tools with correct input schemas (line/character are 0-based numbers)

5. **Updated CallToolRequestSchema handler**: Routes to appropriate handler, returns JSON result

### Cross-package limitation documentation

Added comments in both files:
- `src/lsp-client.ts`: On `completionKindToString()` and `gotoDefinition()` method
- `src/server.ts`: On `GotoDefinitionResponse` interface and `handleMoveGotoDefinition()` function
- Tool description for `move_goto_definition` mentions the limitation

### test/fixtures/lsp-test-package/

New fixture package with:
- `Move.toml`: Package configuration
- `sources/main.move`: Contains TestStruct, test_function, TEST_CONST, and sui::object import

### test/integration/lsp-tools.test.ts

Integration tests covering:
- `move_hover`: Returns hover info or null contents (not error) for invalid positions
- `move_completions`: Returns completions array (may be empty)
- `move_goto_definition`: Returns location or SYMBOL_NOT_FOUND error
- Tool listing: Verifies all 4 tools registered with correct schemas
- Input validation: Tests for invalid parameters

## Technical Decisions

1. **Hover returns null instead of error**: Per contract, hovering on whitespace/comments returns `{ contents: null }` not SYMBOL_NOT_FOUND. Only goto-definition throws on empty result.

2. **Completions returns empty array**: Empty completions is a valid response, not an error condition.

3. **0-based line/character**: Consistent with LSP protocol. Input schema descriptions clarify this.

4. **Content parameter precedence**: When `content` is provided, file is synced to LSP via document store without reading disk.

5. **Extracted prepareDocument()**: Reduces code duplication across handlers while maintaining document store sync.

## Verification

- `npm run build` exits 0
- `npm test` exits 0 (59 passed, 16 skipped - integration tests skip without move-analyzer)
