---
type: preparation-digest
mode: existing
tech_stack: "TypeScript, MCP SDK, Claude Code plugins, sui-pilot docs"
agent_roles: "move-agent"
codex_thread_id_prompt_refinement: "019d8663-b0f7-7690-845f-6ea9ba97281c"
---

## Intent Summary

Building a comprehensive Sui development plugin for Claude Code with four components: a specialized Sui & Move agent enforcing doc-first workflow, a Move LSP MCP server wrapping move-analyzer, bundled Move skills (quality, security, tests), and sui-pilot documentation integration. Target: production-grade with full tests and documentation.

## Codebase Findings

Existing plugin architecture is manifest-first with plugin.json defining commands, skills, agents, and MCP servers. Three Move skills already exist and should be bundled. sui-pilot provides read-only doc corpus with AGENTS.md index. No LSP-to-MCP bridge exists; must build custom wrapper.

## Artifacts Written

- .forge/codebase-analysis.md (5299 bytes)
- .forge/planning-prompt.md (11878 bytes)
- .forge/prompt-evolution.md (2840 bytes)
- .forge/agent-config.md (2218 bytes)
