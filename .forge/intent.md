---
type: intent
created: 2026-04-13T12:05:00Z
mode: existing
---

## Original Prompt

Build a Sui plugin for Claude Code that bundles the sui-pilot defining a Sui & Move special agent, that not only enforces checking the latest documents but also to check for move code quality and security review bundling the appropriate skills, and even more important, including the Move LSP server, which we would need to investigate how to include on a plugin since it is not a native anthropic lsp plugin.

## User Answers

### What should the Sui & Move agent's primary behavior be?
**Full development workflow** — Agent handles end-to-end: doc checking → code generation → quality review → security audit

### How should the Move LSP server be integrated?
**MCP wrapper** — Create an MCP server that wraps the move-analyzer LSP, exposing diagnostics/completions as MCP tools

### Which skills should be bundled?
- `move-code-quality` — Analyzes Move packages against the Move Book Code Quality Checklist
- `move-code-review` — Security, architecture, and design review for Move contracts
- `move-tests` — Generates Move unit tests for functions and modules

### Quality bar?
**Production-grade** — Full test coverage, error handling, documentation, ready for public distribution

## Derived Intent

### What We're Building

A comprehensive **Sui development plugin for Claude Code** that transforms Claude into a Sui/Move development expert. The plugin has four core components:

1. **Sui & Move Agent** (`sui-move-agent`)
   - A specialized agent that enforces a doc-first, quality-driven development workflow
   - MUST consult sui-pilot documentation before any Sui/Move code generation
   - Follows a strict pipeline: docs → implement → quality check → security review
   - Triggers quality and security skills automatically after code generation

2. **Move LSP MCP Server** (`move-lsp-mcp`)
   - An MCP server that wraps the `move-analyzer` LSP binary
   - Exposes LSP capabilities (diagnostics, hover, completions, go-to-definition) as MCP tools
   - Enables Claude to get real-time Move compiler feedback without native LSP support
   - Must handle LSP lifecycle (spawn, communicate via JSON-RPC, shutdown)

3. **Bundled Skills**
   - `move-code-quality` — Quality checklist enforcement
   - `move-code-review` — Security and architecture review
   - `move-tests` — Unit test generation

4. **sui-pilot Documentation Integration**
   - Bundle or reference the sui-pilot doc directories (`.sui-docs/`, `.walrus-docs/`, `.seal-docs/`)
   - Agent must search these docs before writing Sui/Move code

### Target Users

Developers using Claude Code for Sui blockchain development who want:
- Authoritative, up-to-date guidance (not stale training data)
- Automated quality gates (no manual `/move-code-quality` invocation)
- IDE-like LSP feedback integrated into Claude's workflow

### Constraints

- Plugin must follow Claude Code plugin structure (plugin.json, agents/, skills/, mcpServers/)
- Move LSP wrapper must be cross-platform or clearly document platform requirements
- Must work with the existing sui-pilot documentation structure
- Production-grade: comprehensive error handling, tests, documentation
