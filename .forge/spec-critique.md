---
type: spec-critique
codex_thread_id: 019d866d-49a5-76a3-902f-7b31aac1509e
rounds: 2
---

# Specification Critique Log

## Round 1: Initial Codex Review

### High Severity Findings

1. **Doc-first workflow not actually enforceable** - The core product claim is that the agent enforces docs -> implement -> quality -> security review, but Soft-enforced means the most important differentiator is advisory, not guaranteed.
   - **Resolution**: Accepted. Added explicit enforcement note in Executive Summary clarifying this is compliance-oriented guidance, not hard prevention. Strengthened acceptance criteria.

2. **Phase 1 does not validate riskiest architecture** - MVP excludes MCP server but that's the highest technical risk.
   - **Resolution**: Accepted. Restructured Phase 1 to include MCP spike with move_diagnostics tool end-to-end.

3. **Acceptance criteria underspecified** - No objective pass/fail criteria for most behaviors.
   - **Resolution**: Accepted. Added specific acceptance criteria including latency targets, error code test requirements, doc-first evidence requirements.

4. **Workspace model too weak** - Nearest Move.toml per request may cause nondeterministic results in monorepos.
   - **Resolution**: Accepted. Added explicit limitations section and failure semantics. Cross-package goto-definition noted as unsupported.

### Medium-High Severity Findings

5. **Doc snapshot has no freshness/provenance model** - No update cadence, version pinning, or staleness detection.
   - **Resolution**: Accepted. Added VERSION.json with supported framework version range, sync timestamp, and compatibility check logic.

6. **Binary compatibility/versioning incomplete** - Version compatibility left open.
   - **Resolution**: Accepted. Added minimum version requirement, version detection on startup, and explicit behavior when version is below minimum.

### Medium Severity Findings

7. **Process lifecycle lacks concurrency/session semantics** - Singleton subprocess but no concurrency rules defined.
   - **Resolution**: Accepted. Added serialization policy, workspace namespacing, and fallback architecture for per-workspace subprocess.

8. **Security review named but not architected** - "Security review" appears as required stage but no mechanism defined.
   - **Resolution**: Clarified that move-code-review IS the security skill. Renamed to "code/security review" to avoid overclaim.

9. **Command/agent routing unclear** - Structural dependency left as open question.
   - **Resolution**: Accepted. Added command-to-agent routing section with primary and fallback modes.

10. **Skill bundling drift risk** - Copy introduces drift without compatibility contract.
    - **Resolution**: Accepted. Added compatibility contract with version validation and post-sync smoke test requirement.

11. **Graceful degradation only for binary absence** - Other degraded states not defined.
    - **Resolution**: Partially accepted. Spec notes fallback architecture. Full degradation matrix deferred to implementation.

### Lower Severity Findings

12. **Grep search too primitive** - No relevance ranking for doc-first assistant.
    - **Resolution**: Not accepted for v1. Noted as future enhancement. AGENTS.md provides topic routing as interim solution.

## Round 2: Codex Follow-up

### Refinements Requested

1. **Doc-first evidence too easy to game** - Just checking for Grep is insufficient.
   - **Resolution**: Accepted. Strengthened to require: specific doc file path citation, Read after Grep, same-task-context requirement.

2. **Shared analyzer process needs validation** - Assumption about move-analyzer behavior.
   - **Resolution**: Accepted. Added fallback architecture section with per-workspace subprocess option if fixture tests show state bleed.

3. **30-day staleness warning too blunt** - Age alone not the real issue.
   - **Resolution**: Accepted. Separated compatibility check (gating) from age check (advisory). Compatibility is more important than age.

4. **Security review may overstate security** - General code review vs actual security checklist.
   - **Resolution**: Accepted. Renamed to "code/security review" throughout.

5. **Skill version validation insufficient** - Post-sync smoke test needed.
   - **Resolution**: Accepted. Added smoke test requirement to compatibility contract.

6. **Command routing fallback needs acceptance criteria**.
   - **Resolution**: Accepted. Added explicit fallback mode and noted both modes must be testable.

7. **Latency targets need scope boundaries** - Missing fixture size, hardware, percentile.
   - **Resolution**: Accepted. Added MCP Tool Latency Criteria table with all scope parameters.

8. **Windows support should be explicitly tiered** - Avoid accidental commitments.
   - **Resolution**: Accepted. Changed to "experimental in v1" with clear language about production support deferred to Phase 3.

## Summary of Spec Changes

| Section | Change |
|---------|--------|
| Executive Summary | Added enforcement note clarifying soft-enforcement |
| User-Facing Entrypoints | Added command-to-agent routing with fallback |
| Process Model | Added fallback architecture, concurrency semantics |
| Workspace Model | Added explicit limitations and failure semantics |
| Skill Bundling | Added compatibility contract and smoke test requirement |
| Documentation Integration | Added VERSION.json schema, compatibility vs age checks |
| Agent Compliance Testing | Strengthened doc-first evidence requirements |
| MCP Tool Latency | New section with scoped targets |
| Cross-platform Testing | Windows marked as experimental |
| Phase 1 | Restructured to include MCP spike |

## Remaining Open Questions

1. Does Claude Code support ${CLAUDE_PLUGIN_ROOT} expansion in plugin.json args?
2. Minimum move-analyzer version for Move 2024 (requires empirical validation)
3. Does move-analyzer emit package-wide diagnostics on demand?
