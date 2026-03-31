#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { hostname } from "node:os";

const MONITOR_URL =
  process.env.COWORKING_MONITOR_URL || "http://localhost:3117/events";

function parseStdin() {
  try {
    const raw = readFileSync(0, "utf8");
    if (!raw.trim()) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function main() {
  const eventType = process.argv[2];
  if (!eventType) process.exit(0);

  const input = parseStdin();
  if (!input) process.exit(0);

  const payload = {
    ...input,
    event_type: eventType,
    hostname: hostname(),
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch(MONITOR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // Silent failure — monitoring should never block Claude Code
  }

  process.exit(0);
}

main();
