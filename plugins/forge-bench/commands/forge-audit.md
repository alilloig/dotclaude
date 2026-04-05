---
description: "Audit a Code Forge run's protocol adherence from its .forge/ artifacts"
argument-hint: "<path-to-.forge-directory>"
---

# Forge Audit

Run the protocol adherence auditor on a `.forge/` artifact directory.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/forge-audit.mjs" $ARGUMENTS
```

Execute the command above via Bash, then present the results as a formatted report with:

1. **Overall Score** — the aggregate protocol adherence score (0.0 to 1.0)
2. **Per-Check Breakdown** — table with each check name, score, passed/total
3. **Violations** — list every failed check with its details
4. **Strengths** — what the orchestrator did correctly
5. **Verdict** — one-line summary: "Strong adherence", "Moderate drift", or "Significant protocol violations"

Format scores as percentages (e.g., 0.857 → 85.7%).
