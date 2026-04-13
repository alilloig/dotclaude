---
type: prompt-evolution
created: 2026-04-13T12:45:00Z
codex_thread_id: 019d8663-b0f7-7690-845f-6ea9ba97281c
---

# Planning Prompt Evolution

## v1 (Claude)

Initial prompt focused on:
- Comprehensive specification covering plugin architecture, agent spec, MCP server design
- Referenced existing resources (sui-pilot, skills, plugin examples)
- Asked for implementation plan, test strategy, user documentation

**Weaknesses identified by Codex**:
- Too broad, invited generic spec instead of resolving hard decisions
- No grounding requirement against actual repo artifacts
- "Auto-triggering" underspecified and possibly infeasible
- MCP server section vague on operational design
- Testing requirement unmeasurable ("full coverage")
- Missing installation story details
- Missing packaging/distribution constraints
- Weak on doc freshness/provenance
- Agent behavioral boundaries undefined
- Skill bundling underdefined
- No explicit non-goals
- Output format too loose

## v2 (Codex)

Codex's improvements:
- Added **Required Grounding** section forcing inspection of repo artifacts
- Split out **Assumptions and Decisions** section
- Converted vague sections into implementation questions
- Changed auto-triggering to require classification (hard/soft/best-effort)
- Made skill bundling concrete (copy vs wrap vs vendor vs reference)
- Upgraded testing to measurable test matrix with acceptance criteria
- Added non-goals section
- Required risk table and open questions

## v3 (Claude synthesis)

Combined best elements:
- Kept Codex's grounding requirement in table format
- Kept decision classification system (hard/soft/best-effort)
- Kept measurable test matrix structure
- Kept risk and open questions sections
- Added more concrete MCP tool definition template
- Added skill bundling decision matrix
- Structured implementation plan with phases

**Remaining weaknesses (Codex feedback on v3)**:
- Need to separate "derived from artifacts" vs "new proposed design"
- Hand-wavy on Claude Code mechanics (commands invoke agents, agents use skills)
- Agent test requirement not operationally testable
- Missing file/project scope decision for MCP
- Missing configuration surfaces specification
- Missing packaging economics decision for docs
- Ambiguous phase boundaries in implementation plan
- Missing "alternatives considered" section

## v4 (Final, converged)

Incorporated all Codex feedback:
- Section 2: Separate derived vs proposed decisions
- Section 3: Specify exact user-facing entrypoints
- Section 5: File vs package diagnostics, workspace-root resolution
- Section 7: Plugin size and distribution implications
- Section 8: Observable compliance checks, not assumed hard enforcement
- Added Section 13: Alternatives Considered

See `/Users/alilloig/workspace/claudefiles/.forge/planning-prompt.md` for final prompt.
