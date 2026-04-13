---
cycle: 6
name: Integration Closure
---

## Scope

Final integration cycle: E2E testing, agent compliance test suite, complete documentation, and packaging validation. This cycle ensures all components work together and the plugin is production-ready.

## Completion Criteria

### 1. E2E Test Suite
- [ ] E2E test file exists at `test/e2e/plugin-workflow.test.ts`
- [ ] Test exercises: document open -> diagnostics -> hover -> completions -> goto definition
- [ ] Test passes (`pnpm test:e2e` exits 0)

### 2. Agent Compliance Fixtures
- [ ] Compliant workflow fixture exists at `.claude-plugin/fixtures/compliant-workflow-transcript.md`
  - Contains: doc read -> grep -> cite doc path -> code edit -> quality skill -> review skill
- [ ] Non-compliant workflow fixture exists at `.claude-plugin/fixtures/non-compliant-workflow-transcript.md`
  - Contains: code edit BEFORE any doc read/grep (demonstrates detectable violation)
- [ ] Compliance validation guide at `docs/COMPLIANCE.md` explaining:
  - What makes a transcript compliant vs non-compliant
  - How to audit agent behavior

### 3. Documentation (all files in `docs/`)
- [ ] `INSTALL.md` contains sections: Prerequisites, Plugin Installation, move-analyzer Installation
- [ ] `PLATFORMS.md` contains sections: macOS Setup, Linux Setup, Windows (Experimental)
- [ ] `CONFIGURATION.md` documents these 4 env vars: MOVE_ANALYZER_PATH, MOVE_LSP_TIMEOUT_MS, MOVE_LSP_LOG_LEVEL, MOVE_LSP_MAX_RESTARTS
- [ ] `USAGE.md` contains examples for: asking questions, generating modules, reviewing packages, using MCP tools
- [ ] `SKILLS.md` documents all 3 skills: move-code-quality, move-code-review, move-tests
- [ ] `TROUBLESHOOTING.md` covers: missing binary, no Move.toml, stale docs, Windows PATH, analyzer crash

### 4. Build Validation
- [ ] `pnpm build` exits 0 in MCP server directory
- [ ] `pnpm test` exits 0 (all unit tests pass)
- [ ] `dist/index.js` exists after build

### 5. Packaging Validation
- [ ] `plugin.json` is valid JSON
- [ ] All paths referenced in plugin.json exist:
  - `./commands/sui-move.md`
  - `./commands/move-code-quality.md`
  - `./commands/move-code-review.md`
  - `./commands/move-tests.md`
  - `skills/` directory
- [ ] MCP server entry point exists: `mcp/move-lsp-mcp/dist/index.js`

### 6. README
- [ ] `README.md` exists in plugin root
- [ ] Contains sections: Overview, Features, Installation, Quick Start, Documentation

## Verification Commands

```bash
# Build validation
cd /Users/alilloig/workspace/claudefiles/plugins/sui-move/mcp/move-lsp-mcp && pnpm build && test -f dist/index.js
cd /Users/alilloig/workspace/claudefiles/plugins/sui-move/mcp/move-lsp-mcp && pnpm test

# Manifest validation
cat /Users/alilloig/workspace/claudefiles/plugins/sui-move/.claude-plugin/plugin.json | jq .

# Documentation existence
test -f /Users/alilloig/workspace/claudefiles/plugins/sui-move/docs/INSTALL.md
test -f /Users/alilloig/workspace/claudefiles/plugins/sui-move/docs/PLATFORMS.md
test -f /Users/alilloig/workspace/claudefiles/plugins/sui-move/docs/CONFIGURATION.md
test -f /Users/alilloig/workspace/claudefiles/plugins/sui-move/docs/USAGE.md
test -f /Users/alilloig/workspace/claudefiles/plugins/sui-move/docs/SKILLS.md
test -f /Users/alilloig/workspace/claudefiles/plugins/sui-move/docs/TROUBLESHOOTING.md
test -f /Users/alilloig/workspace/claudefiles/plugins/sui-move/docs/COMPLIANCE.md

# Fixtures existence
test -f /Users/alilloig/workspace/claudefiles/plugins/sui-move/.claude-plugin/fixtures/compliant-workflow-transcript.md
test -f /Users/alilloig/workspace/claudefiles/plugins/sui-move/.claude-plugin/fixtures/non-compliant-workflow-transcript.md

# README existence
test -f /Users/alilloig/workspace/claudefiles/plugins/sui-move/README.md

# Packaging validation
test -d /Users/alilloig/workspace/claudefiles/plugins/sui-move/skills
test -f /Users/alilloig/workspace/claudefiles/plugins/sui-move/commands/sui-move.md
test -f /Users/alilloig/workspace/claudefiles/plugins/sui-move/mcp/move-lsp-mcp/dist/index.js
```

## Context from Previous Cycles

- **Cycle 1**: Plugin foundation with MCP server (move_diagnostics), agent with doc-first workflow, bundled sui-pilot docs
- **Cycle 2**: Three bundled skills (move-code-quality, move-code-review, move-tests) with slash commands
- **Cycle 3**: Document store for LSP text sync, workspace resolver with LRU cache, error taxonomy
- **Cycle 4**: Implemented move_hover, move_completions, move_goto_definition MCP tools
- **Cycle 5**: Crash recovery with restart limits, workspace-aware LSP, document version preservation

All MCP tools (4 total) are functional. Skills are bundled. Agent enforces doc-first workflow. Recovery mechanisms in place.

## Environment

- Node.js 18+
- pnpm
- macOS or Linux for full validation (Windows experimental)
- move-analyzer binary for integration tests (tests skip gracefully if unavailable)
