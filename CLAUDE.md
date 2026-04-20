# Global Claude Code Guidelines

## Preferred Stack

- **TypeScript** over JavaScript — always `.ts`/`.tsx`
- **pnpm** — never npm or yarn
- **Next.js + React** for frontend
- **Sui Move** (edition 2024) for smart contracts

## Communication

- Concise, no fluff — lead with action, skip preambles
- Ask before big architectural or design decisions; proceed on obvious stuff
- Spanish-friendly — user is native Spanish speaker, switch freely if helpful

## Sui Move Development

### Authoritative Documentation (REQUIRED)

**BEFORE any Sui/Move/Walrus/Seal work**, consult the sui-pilot documentation copilot:

1. **Read the index**: `~/workspace/claudefiles/plugins/sui-pilot/AGENTS.md`
2. **Search the docs**: Use Grep/Read on the appropriate doc directory based on the topic:
   - **Sui/Move**: `~/workspace/claudefiles/plugins/sui-pilot/.sui-docs/` (blockchain, Move language, objects, transactions, SDKs)
   - **Walrus**: `~/workspace/claudefiles/plugins/sui-pilot/.walrus-docs/` (decentralized storage, blobs, Walrus Sites, TypeScript SDK)
   - **Seal**: `~/workspace/claudefiles/plugins/sui-pilot/.seal-docs/` (secrets management, encryption, key servers, access control)
3. **Verify patterns**: Cross-reference code patterns against the official docs before writing code

**Why**: Sui Move evolves rapidly and training data goes stale. sui-pilot contains doc files across three ecosystems (Sui, Walrus, Seal) extracted from official documentation. Always prefer these docs over memory.

### Code Quality Workflow (MANDATORY)

**AFTER completing Move implementation**, run the code quality checker:

```
/move-code-quality
```

**Iterate until no issues remain**:
- Address all critical issues immediately
- Apply recommended improvements
- Re-run `/move-code-quality` after each fix cycle
- Only consider implementation complete when the tool reports no issues

This ensures all Move code follows the Move Book Code Quality Checklist standards.

### Move.toml Configuration

```toml
[package]
name = "my_package"
edition = "2024"
```

## Plan Mode Behavior

When in plan mode, actively use the AskUserQuestion tool to clarify requirements, validate assumptions, and present implementation choices before finalizing the plan. Do not write a complete plan without first gathering input through structured questions. Prefer interactive refinement over monologue-style planning.

