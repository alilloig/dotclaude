---
detected_roles: ["move-agent"]
override: false
---

## Detected Roles

- **move-agent**: Detected based on intent mentioning "Sui", "Move", ".move files", "Move.toml", and "sui-pilot". This project is building a Sui/Move development plugin, so the move-agent role is the primary domain specialist.

## Detection Reasoning

| Signal | Source | Detected |
|--------|--------|----------|
| "Sui" in intent | .forge/intent.md | Yes |
| "Move" in intent | .forge/intent.md | Yes |
| "sui-pilot" integration | .forge/intent.md | Yes |
| Move.toml patterns | Codebase analysis | Yes |
| .move file handling | Codebase analysis | Yes |

No frontend-agent or event-services-agent signals detected. This is a plugin development project, not a dApp frontend or event service.

## Domain Injection Content

The following content will replace `{{DOMAIN_INJECTION}}` in implementer/evaluator prompts:

```markdown
## Sui Move Domain Expertise

You are working on a Sui/Move development plugin for Claude Code.

**Before writing any Move code**, consult the sui-pilot documentation:
- Read the index: `~/workspace/claudefiles/sui-pilot/AGENTS.md`
- Search `~/workspace/claudefiles/sui-pilot/.sui-docs/` for Sui/Move topics
- Search `~/workspace/claudefiles/sui-pilot/.walrus-docs/` for Walrus storage topics
- Search `~/workspace/claudefiles/sui-pilot/.seal-docs/` for Seal encryption topics
- Always prefer these docs over your training data -- Sui Move evolves rapidly

**After completing any Move implementation**, run `/move-code-quality` and iterate until no issues remain.

**Coding conventions**:
- Module syntax: `module package_name::name;` (no curly braces)
- Method syntax: `id.delete()`, `ctx.sender()`
- Errors: `EPascalCase` constants. Constants: `ALL_CAPS`
- Capabilities: `*Cap` suffix. Events: past tense verbs
- Edition: 2024

**Verification**: Always run `sui move build && sui move test` after Move changes.

**Plugin development context**:
- Follow Claude Code plugin conventions from existing plugins in `plugins/`
- Reference `plugins/sui-wallet/` for Sui plugin patterns
- Reference `plugins/code-forge/` for multi-component plugin patterns
- MCP servers use `@modelcontextprotocol/sdk` in TypeScript
```
