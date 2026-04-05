#!/usr/bin/env node

/**
 * forge-audit — Post-hoc protocol adherence auditor for Code Forge runs.
 *
 * Analyzes a .forge/ artifact directory and scores how well the orchestrator
 * followed the forge protocol. Produces a JSON scorecard on stdout.
 *
 * Usage: node forge-audit.mjs <path-to-.forge-directory>
 *
 * Checks:
 *   1. Phase completeness — were all required phases executed?
 *   2. Phase ordering — did artifacts appear in the correct sequence?
 *   3. Contract compliance — did every cycle have a contract before implementation?
 *   4. Evaluation compliance — did every cycle get evaluated before the next began?
 *   5. Codex gate compliance — were Codex review artifacts produced at each gate?
 *   6. Iteration discipline — did failed evaluations trigger retries (not skips)?
 *   7. Artifact completeness — are all expected files present and non-empty?
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

// --- Helpers ---

function readFile(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function readFrontmatter(filePath) {
  const content = readFile(filePath);
  if (!content) return null;
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const pairs = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^([\w-]+):\s*"?([^"]*)"?\s*$/);
    if (kv) pairs[kv[1]] = kv[2].trim();
  }
  return pairs;
}

function fileExists(path) {
  return existsSync(path);
}

function fileNonEmpty(path) {
  try {
    const stat = statSync(path);
    return stat.size > 10; // More than just frontmatter delimiters
  } catch {
    return false;
  }
}

function getCycleDirectories(forgeRoot) {
  const cyclesDir = resolve(forgeRoot, "cycles");
  if (!existsSync(cyclesDir)) return [];
  return readdirSync(cyclesDir)
    .filter((d) => /^\d+$/.test(d))
    .map(Number)
    .sort((a, b) => a - b);
}

// --- Audit Checks ---

function auditPhaseCompleteness(forgeRoot, status) {
  const artifacts = {
    "intent.md": { phase: "Intent Sharpening (Phase 0)", required: true },
    "planning-prompt.md": { phase: "Prompt Refinement (Phase 1)", required: true },
    "spec.md": { phase: "Specification (Phase 2)", required: true },
    "cycle-plan.md": { phase: "Cycle Planning (Phase 4)", required: true },
    "final-review.md": { phase: "Final Review (Phase F)", required: true },
    // Conditional
    "codebase-analysis.md": { phase: "Codebase Exploration (Phase 0.5)", required: false },
    "agent-config.md": { phase: "Agent Detection (Phase 1.5)", required: false },
  };

  const results = [];
  let passed = 0;
  let total = 0;

  for (const [file, meta] of Object.entries(artifacts)) {
    const path = resolve(forgeRoot, file);
    const exists = fileNonEmpty(path);

    if (meta.required) total++;

    results.push({
      artifact: file,
      phase: meta.phase,
      required: meta.required,
      present: exists,
      pass: meta.required ? exists : true,
    });

    if (meta.required && exists) passed++;
  }

  return {
    name: "Phase Completeness",
    score: total > 0 ? passed / total : 1,
    passed,
    total,
    details: results,
  };
}

function auditPhaseOrdering(forgeRoot) {
  // Check that artifacts were created in the right order by comparing
  // file modification times
  const orderedArtifacts = [
    "intent.md",
    "planning-prompt.md",
    "prompt-evolution.md",
    "spec.md",
    "spec-critique.md",
    "cycle-plan.md",
  ];

  const timestamps = [];
  for (const file of orderedArtifacts) {
    const path = resolve(forgeRoot, file);
    try {
      const stat = statSync(path);
      timestamps.push({ file, mtime: stat.mtimeMs });
    } catch {
      // File doesn't exist — skip
    }
  }

  let violations = [];
  for (let i = 1; i < timestamps.length; i++) {
    if (timestamps[i].mtime < timestamps[i - 1].mtime) {
      violations.push({
        earlier: timestamps[i - 1].file,
        later: timestamps[i].file,
        issue: `${timestamps[i].file} was modified before ${timestamps[i - 1].file}`,
      });
    }
  }

  return {
    name: "Phase Ordering",
    score: timestamps.length > 1 ? 1 - violations.length / (timestamps.length - 1) : 1,
    passed: timestamps.length - 1 - violations.length,
    total: Math.max(timestamps.length - 1, 1),
    details: violations.length > 0 ? violations : [{ status: "All artifacts in correct order" }],
  };
}

function auditContractCompliance(forgeRoot) {
  const cycles = getCycleDirectories(forgeRoot);
  if (cycles.length === 0) return { name: "Contract Compliance", score: 0, passed: 0, total: 0, details: [{ status: "No cycles found" }] };

  let passed = 0;
  const details = [];

  for (const n of cycles) {
    const contractPath = resolve(forgeRoot, "cycles", String(n), "contract.md");
    const implPath = resolve(forgeRoot, "cycles", String(n), "implementation-notes.md");
    const hasContract = fileNonEmpty(contractPath);
    const hasImpl = fileExists(implPath);

    if (hasImpl && !hasContract) {
      details.push({ cycle: n, pass: false, issue: "Implementation exists without contract" });
    } else if (hasContract) {
      // Check contract came before implementation (by mtime)
      let ordered = true;
      if (hasImpl) {
        try {
          const contractTime = statSync(contractPath).mtimeMs;
          const implTime = statSync(implPath).mtimeMs;
          ordered = contractTime <= implTime;
        } catch {
          ordered = true; // Can't determine — give benefit of doubt
        }
      }
      if (ordered) {
        details.push({ cycle: n, pass: true });
        passed++;
      } else {
        details.push({ cycle: n, pass: false, issue: "Implementation started before contract was written" });
      }
    } else {
      // No impl, no contract — cycle may not have started
      details.push({ cycle: n, pass: true, note: "Cycle not started" });
      passed++;
    }
  }

  return {
    name: "Contract Compliance",
    score: cycles.length > 0 ? passed / cycles.length : 1,
    passed,
    total: cycles.length,
    details,
  };
}

function auditEvaluationCompliance(forgeRoot) {
  const cycles = getCycleDirectories(forgeRoot);
  if (cycles.length <= 1) return { name: "Evaluation Compliance", score: 1, passed: 0, total: 0, details: [{ status: "Single or no cycles — nothing to check" }] };

  let passed = 0;
  let total = 0;
  const details = [];

  for (let i = 0; i < cycles.length - 1; i++) {
    const n = cycles[i];
    const nextN = cycles[i + 1];
    total++;

    const evalPath = resolve(forgeRoot, "cycles", String(n), "evaluation.md");
    const nextContractPath = resolve(forgeRoot, "cycles", String(nextN), "contract.md");

    if (!fileExists(nextContractPath)) {
      // Next cycle never started — skip
      details.push({ cycle: n, pass: true, note: `Cycle ${nextN} not started` });
      passed++;
      continue;
    }

    if (!fileExists(evalPath)) {
      details.push({ cycle: n, pass: false, issue: `No evaluation before cycle ${nextN} started` });
      continue;
    }

    const fm = readFrontmatter(evalPath);
    const verdict = (fm?.verdict || "").toUpperCase();

    if (verdict === "PASS") {
      details.push({ cycle: n, pass: true, verdict: "PASS" });
      passed++;
    } else if (verdict === "FAIL") {
      details.push({ cycle: n, pass: false, issue: `Cycle advanced to ${nextN} despite FAIL verdict`, verdict });
    } else {
      details.push({ cycle: n, pass: false, issue: `Evaluation verdict is "${verdict || "MISSING"}", not PASS`, verdict: verdict || "MISSING" });
    }
  }

  return {
    name: "Evaluation Compliance",
    score: total > 0 ? passed / total : 1,
    passed,
    total,
    details,
  };
}

function auditCodexGates(forgeRoot, status) {
  const lightMode = status?.["light_mode"] === "true" || status?.["light-mode"] === "true";
  const cycles = getCycleDirectories(forgeRoot);

  const gates = [];

  // G1: prompt-evolution.md
  gates.push({
    gate: "G1",
    name: "Prompt Refinement",
    artifact: "prompt-evolution.md",
    required: true,
    present: fileNonEmpty(resolve(forgeRoot, "prompt-evolution.md")),
  });

  // G2: spec-critique.md
  gates.push({
    gate: "G2",
    name: "Spec Critique",
    artifact: "spec-critique.md",
    required: !lightMode,
    present: fileNonEmpty(resolve(forgeRoot, "spec-critique.md")),
  });

  // G5: codex-review.md per cycle
  for (const n of cycles) {
    gates.push({
      gate: `G5-cycle${n}`,
      name: `Cycle ${n} Codex Review`,
      artifact: `cycles/${n}/codex-review.md`,
      required: true,
      present: fileNonEmpty(resolve(forgeRoot, "cycles", String(n), "codex-review.md")),
    });
  }

  // G6: final-review.md (should contain Codex assessment)
  const finalReview = readFile(resolve(forgeRoot, "final-review.md"));
  const hasCodexInFinal = finalReview ? /codex/i.test(finalReview) : false;
  gates.push({
    gate: "G6",
    name: "Final Codex Verdict",
    artifact: "final-review.md (with Codex content)",
    required: true,
    present: hasCodexInFinal,
  });

  const requiredGates = gates.filter((g) => g.required);
  const passed = requiredGates.filter((g) => g.present).length;

  return {
    name: "Codex Gate Compliance",
    score: requiredGates.length > 0 ? passed / requiredGates.length : 1,
    passed,
    total: requiredGates.length,
    lightMode,
    details: gates,
  };
}

function auditIterationDiscipline(forgeRoot) {
  const cycles = getCycleDirectories(forgeRoot);
  if (cycles.length === 0) return { name: "Iteration Discipline", score: 1, passed: 0, total: 0, details: [] };

  let total = 0;
  let passed = 0;
  const details = [];

  for (const n of cycles) {
    const evalPath = resolve(forgeRoot, "cycles", String(n), "evaluation.md");
    if (!fileExists(evalPath)) continue;

    const fm = readFrontmatter(evalPath);
    const verdict = (fm?.verdict || "").toUpperCase();
    const iteration = parseInt(fm?.iteration || "1", 10);

    total++;

    if (verdict === "PASS") {
      details.push({ cycle: n, pass: true, iterations: iteration, verdict });
      passed++;
    } else if (verdict === "FAIL" && iteration >= 2) {
      // Failed but retried — that's discipline
      details.push({ cycle: n, pass: true, iterations: iteration, verdict, note: "Retried after failure" });
      passed++;
    } else if (verdict === "FAIL" && iteration === 1) {
      // Check if there's a subsequent iteration (impl-notes with higher iteration)
      // This is a soft check — might just be the final state
      details.push({ cycle: n, pass: false, iterations: iteration, verdict, issue: "FAIL on first iteration — check if retry occurred" });
    } else {
      details.push({ cycle: n, pass: true, iterations: iteration, verdict: verdict || "N/A" });
      passed++;
    }
  }

  return {
    name: "Iteration Discipline",
    score: total > 0 ? passed / total : 1,
    passed,
    total,
    details,
  };
}

function auditArtifactCompleteness(forgeRoot) {
  const cycles = getCycleDirectories(forgeRoot);
  const expected = [];

  // Per-cycle artifacts
  for (const n of cycles) {
    const base = resolve(forgeRoot, "cycles", String(n));
    expected.push(
      { path: join("cycles", String(n), "contract.md"), required: true },
      { path: join("cycles", String(n), "implementation-notes.md"), required: true },
      { path: join("cycles", String(n), "evaluation.md"), required: true },
      { path: join("cycles", String(n), "codex-review.md"), required: false },
    );
  }

  let passed = 0;
  let total = 0;
  const details = [];

  for (const item of expected) {
    const fullPath = resolve(forgeRoot, item.path);
    const present = fileNonEmpty(fullPath);

    if (item.required) total++;

    details.push({
      artifact: item.path,
      required: item.required,
      present,
      pass: item.required ? present : true,
    });

    if (item.required && present) passed++;
  }

  return {
    name: "Artifact Completeness (per-cycle)",
    score: total > 0 ? passed / total : 1,
    passed,
    total,
    details,
  };
}

// --- Main ---

function main() {
  const forgeRoot = process.argv[2];

  if (!forgeRoot) {
    console.error("Usage: node forge-audit.mjs <path-to-.forge-directory>");
    process.exit(1);
  }

  if (!existsSync(forgeRoot)) {
    console.error(`Error: ${forgeRoot} does not exist`);
    process.exit(1);
  }

  const statusPath = resolve(forgeRoot, "status.md");
  const status = readFrontmatter(statusPath);
  const cycles = getCycleDirectories(forgeRoot);

  const checks = [
    auditPhaseCompleteness(forgeRoot, status),
    auditPhaseOrdering(forgeRoot),
    auditContractCompliance(forgeRoot),
    auditEvaluationCompliance(forgeRoot),
    auditCodexGates(forgeRoot, status),
    auditIterationDiscipline(forgeRoot),
    auditArtifactCompleteness(forgeRoot),
  ];

  const overallScore = checks.reduce((sum, c) => sum + c.score, 0) / checks.length;

  const scorecard = {
    forgeRoot,
    timestamp: new Date().toISOString(),
    status: status || {},
    totalCycles: cycles.length,
    overallScore: Math.round(overallScore * 1000) / 1000,
    checks,
  };

  console.log(JSON.stringify(scorecard, null, 2));
}

main();
