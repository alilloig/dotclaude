#!/usr/bin/env node

/**
 * Forge Guard — Programmatic enforcement for the Code Forge protocol.
 *
 * Prevents protocol drift by enforcing four invariants:
 *   1. No implementation without a contract
 *   2. No advancing past a FAIL evaluation
 *   3. Phase transitions must follow order
 *   4. Codex gates cannot be silently skipped (unless --light)
 *
 * PreToolUse (exit 2 = block):
 *   - Blocks writes to implementation-notes.md when contract.md is missing
 *   - Blocks status.md updates that skip to a later cycle when evaluation is FAIL
 *
 * PostToolUse (exit 0, stderr = advise):
 *   - Warns on illegal phase transitions in status.md
 *   - Warns on missing Codex gate artifacts
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";

// --- Phase ordering (linear, no skips) ---

const PHASE_ORDER = [
  "intent",
  "exploration",
  "prompt-refinement",
  "agent-detection",
  "specification",
  "spec-critique",
  "cycle-planning",
  "cycle",
  "done",
];

// Phases that may be conditionally skipped (exploration is skip-if-greenfield)
const SKIPPABLE_PHASES = new Set(["exploration", "agent-detection"]);

// --- Helpers ---

function parseStdin() {
  try {
    const raw = readFileSync(0, "utf8");
    if (!raw.trim()) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readYamlFrontmatter(filePath) {
  try {
    const content = readFileSync(filePath, "utf8");
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;
    // Simple YAML key-value parser (no nested objects needed)
    const pairs = {};
    for (const line of match[1].split("\n")) {
      const kv = line.match(/^(\w[\w-]*):\s*"?([^"]*)"?\s*$/);
      if (kv) pairs[kv[1]] = kv[2].trim();
    }
    return pairs;
  } catch {
    return null;
  }
}

function findForgeRoot(filePath) {
  // Extract .forge/ root directly from the path
  const match = filePath.match(/^(.+\/\.forge)\//);
  if (match) return match[1];
  if (filePath.endsWith("/.forge")) return filePath;
  return null;
}

function extractCycleNumber(filePath) {
  const match = filePath.match(/\.forge\/cycles\/(\d+)\//);
  return match ? parseInt(match[1], 10) : null;
}

function isForgeArtifact(filePath) {
  return filePath && filePath.includes(".forge/");
}

// --- Invariant Checks (PreToolUse — can block) ---

/**
 * Invariant 1: No implementation without a contract.
 * Blocks writes to cycles/N/implementation-notes.md when cycles/N/contract.md
 * does not exist.
 */
function checkContractExists(filePath) {
  if (!filePath.match(/\.forge\/cycles\/\d+\/implementation-notes\.md$/)) return null;

  const cycleN = extractCycleNumber(filePath);
  if (cycleN === null) return null;

  const forgeRoot = findForgeRoot(filePath);
  // Derive contract path from the file path directly as fallback
  const cycleDir = dirname(filePath);
  const contractPath = forgeRoot
    ? resolve(forgeRoot, "cycles", String(cycleN), "contract.md")
    : resolve(cycleDir, "contract.md");
  if (existsSync(contractPath)) return null;

  return [
    "[BLOCK] Forge Guard: missing contract",
    "",
    `Cannot write implementation notes for cycle ${cycleN} — no contract found.`,
    `Expected: ${contractPath}`,
    "",
    "The forge protocol requires a negotiated completion contract (Phase 5a)",
    "before implementation begins. Complete contract negotiation first.",
  ].join("\n");
}

/**
 * Invariant 2: No advancing past a FAIL evaluation.
 * Blocks writes to cycles/N+1/* when cycles/N/evaluation.md has verdict: FAIL
 * (or doesn't exist, if N >= 1 and there should have been an evaluation).
 */
function checkEvaluationPassed(filePath) {
  // Only check writes to cycle artifacts
  const cycleN = extractCycleNumber(filePath);
  if (cycleN === null || cycleN <= 1) return null;

  // Only enforce for contract.md (start of new cycle) to avoid blocking
  // retries within the same cycle
  if (!filePath.match(/\.forge\/cycles\/\d+\/contract\.md$/)) return null;

  const forgeRoot = findForgeRoot(filePath);
  const prevCycle = cycleN - 1;

  const evalPath = forgeRoot
    ? resolve(forgeRoot, "cycles", String(prevCycle), "evaluation.md")
    : resolve(dirname(dirname(filePath)), String(prevCycle), "evaluation.md");

  if (!existsSync(evalPath)) {
    return [
      `[BLOCK] Forge Guard: cycle ${prevCycle} not evaluated`,
      "",
      `Cannot start cycle ${cycleN} — no evaluation found for cycle ${prevCycle}.`,
      `Expected: ${evalPath}`,
      "",
      "Each cycle must be evaluated before the next one begins.",
    ].join("\n");
  }

  const frontmatter = readYamlFrontmatter(evalPath);
  if (!frontmatter) return null; // Can't parse — don't block

  const verdict = (frontmatter.verdict || "").toUpperCase();
  if (verdict === "PASS") return null;

  return [
    `[BLOCK] Forge Guard: cycle ${prevCycle} evaluation is ${verdict || "UNKNOWN"}`,
    "",
    `Cannot start cycle ${cycleN} — cycle ${prevCycle} has not passed evaluation.`,
    `Evaluation file: ${evalPath}`,
    "",
    "The implementer must address evaluation findings and receive a PASS verdict",
    "before the next cycle can begin (Phase 5d iteration loop).",
  ].join("\n");
}

// --- Invariant Checks (PostToolUse — advisory) ---

/**
 * Invariant 3: Phase transitions must follow order.
 * After a write to status.md, checks that the new phase is reachable from
 * the previous phase without illegal skips.
 */
function checkPhaseTransition(filePath, forgeRoot) {
  if (!filePath.endsWith("status.md") || !filePath.includes(".forge/")) return null;

  const frontmatter = readYamlFrontmatter(filePath);
  if (!frontmatter || !frontmatter.phase) return null;

  const newPhase = frontmatter.phase;
  const newIdx = PHASE_ORDER.indexOf(newPhase);
  if (newIdx === -1) return null; // Unknown phase — don't advise

  // Read previous status from git or cache? No — we check against the phase
  // order constraint. If the phase jumped forward by more than 1 non-skippable
  // step, warn.
  //
  // We can't easily know the "previous" phase in a PostToolUse hook (the file
  // was already written). Instead, validate that required artifacts exist for
  // the claimed phase.

  if (!forgeRoot) return null;

  const missingPrereqs = [];

  // If in cycle phase, spec must exist
  if (newPhase === "cycle" || newPhase === "cycle-planning") {
    if (!existsSync(resolve(forgeRoot, "spec.md"))) {
      missingPrereqs.push("spec.md (Phase 2: Specification)");
    }
  }

  // If in cycle phase, cycle-plan must exist
  if (newPhase === "cycle") {
    if (!existsSync(resolve(forgeRoot, "cycle-plan.md"))) {
      missingPrereqs.push("cycle-plan.md (Phase 4: Cycle Planning)");
    }
  }

  // If in spec-critique, spec must exist
  if (newPhase === "spec-critique") {
    if (!existsSync(resolve(forgeRoot, "spec.md"))) {
      missingPrereqs.push("spec.md (Phase 2: Specification)");
    }
  }

  // If in prompt-refinement, intent must exist
  if (newPhase === "prompt-refinement" || newPhase === "specification") {
    if (!existsSync(resolve(forgeRoot, "intent.md"))) {
      missingPrereqs.push("intent.md (Phase 0: Intent Sharpening)");
    }
  }

  // If in specification, planning-prompt should exist
  if (newPhase === "specification") {
    if (!existsSync(resolve(forgeRoot, "planning-prompt.md"))) {
      missingPrereqs.push("planning-prompt.md (Phase 1: Prompt Refinement)");
    }
  }

  if (missingPrereqs.length === 0) return null;

  return [
    "[ADVISE] Forge Guard: possible phase skip detected",
    "",
    `Status updated to phase "${newPhase}" but prerequisite artifacts are missing:`,
    ...missingPrereqs.map((p) => `  - ${p}`),
    "",
    "This may indicate the protocol skipped earlier phases.",
    "Review the forge workflow and ensure all prior phases completed.",
  ].join("\n");
}

/**
 * Invariant 4: Codex gates cannot be silently skipped (unless --light).
 * After advancing to certain phases, checks that Codex review artifacts exist.
 */
function checkCodexGates(filePath, forgeRoot) {
  if (!filePath.endsWith("status.md") || !filePath.includes(".forge/")) return null;
  if (!forgeRoot) return null;

  const frontmatter = readYamlFrontmatter(filePath);
  if (!frontmatter) return null;

  const lightMode = frontmatter["light_mode"] === "true" || frontmatter["light-mode"] === "true";
  const phase = frontmatter.phase;
  const currentCycle = parseInt(frontmatter["current_cycle"] || frontmatter["current-cycle"] || "0", 10);

  const missing = [];

  // G1: prompt-evolution should exist by specification phase
  if (phase === "specification" || phase === "spec-critique" || phase === "cycle-planning" || phase === "cycle") {
    if (!existsSync(resolve(forgeRoot, "prompt-evolution.md"))) {
      missing.push("prompt-evolution.md (Gate G1: Prompt Refinement with Codex)");
    }
  }

  // G2: spec-critique should exist by cycle-planning phase
  if (!lightMode && (phase === "cycle-planning" || phase === "cycle")) {
    if (!existsSync(resolve(forgeRoot, "spec-critique.md"))) {
      missing.push("spec-critique.md (Gate G2: Spec Critique by Codex)");
    }
  }

  // G5: codex-review for completed previous cycles
  if (phase === "cycle" && currentCycle > 1) {
    for (let i = 1; i < currentCycle; i++) {
      const reviewPath = resolve(forgeRoot, "cycles", String(i), "codex-review.md");
      if (!existsSync(reviewPath)) {
        missing.push(`cycles/${i}/codex-review.md (Gate G5: Codex Cycle Review)`);
      }
    }
  }

  if (missing.length === 0) return null;

  const prefix = lightMode
    ? "[ADVISE] Forge Guard: Codex artifacts missing (light mode — may be expected)"
    : "[ADVISE] Forge Guard: Codex gate artifacts missing";

  return [
    prefix,
    "",
    "The following Codex review artifacts were not found:",
    ...missing.map((m) => `  - ${m}`),
    "",
    lightMode
      ? "Light mode is active — some Codex gates are optional. Verify this is expected."
      : "The forge protocol requires Codex cross-checking at each gate.",
  ].join("\n");
}

// --- Main ---

async function main() {
  const hookType = process.argv[2]; // "pre-tool-use" or "post-tool-use"
  const input = parseStdin();

  if (!input || !input.tool_input) process.exit(0);

  const filePath = input.tool_input.file_path;
  if (!filePath || !isForgeArtifact(filePath)) process.exit(0);

  const forgeRoot = findForgeRoot(filePath);

  if (hookType === "pre-tool-use") {
    // PreToolUse: blocking checks
    const violations = [
      checkContractExists(filePath),
      checkEvaluationPassed(filePath),
    ].filter(Boolean);

    if (violations.length > 0) {
      process.stderr.write(violations.join("\n\n---\n\n") + "\n");
      process.exit(2); // Block the tool call
    }
    process.exit(0);
  }

  if (hookType === "post-tool-use") {
    // PostToolUse: advisory checks
    const advisories = [
      checkPhaseTransition(filePath, forgeRoot),
      checkCodexGates(filePath, forgeRoot),
    ].filter(Boolean);

    if (advisories.length > 0) {
      process.stderr.write(advisories.join("\n\n---\n\n") + "\n");
    }
    process.exit(0);
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
