#!/usr/bin/env bash
set -euo pipefail

# forge-bench — Run the same prompt through two forge plugin variants in parallel
#
# Usage: forge-bench.sh "<prompt>" [--budget <usd>] [--model <model>] [--label <name>]
#
# Creates a timestamped benchmark directory under .forge-bench/ with:
#   original/  — run with code-forge plugin
#   rig/       — run with code-forge-rig plugin
#   results.json — merged session metadata + audit scorecards

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_BASE="${SCRIPT_DIR}/../.."  # points to plugins/ parent

# --- Defaults ---
BUDGET="50"
MODEL="opus"
LABEL=""

# --- Parse args ---
PROMPT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --budget) BUDGET="$2"; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    --label) LABEL="$2"; shift 2 ;;
    *) PROMPT="$1"; shift ;;
  esac
done

if [[ -z "$PROMPT" ]]; then
  echo "Usage: forge-bench.sh \"<prompt>\" [--budget <usd>] [--model <model>] [--label <name>]"
  exit 1
fi

# --- Setup benchmark directory ---
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BENCH_LABEL="${LABEL:-bench-${TIMESTAMP}}"
BENCH_DIR=".forge-bench/${BENCH_LABEL}"

mkdir -p "${BENCH_DIR}/original" "${BENCH_DIR}/rig"

# Save the prompt
echo "$PROMPT" > "${BENCH_DIR}/prompt.txt"

# Save benchmark metadata
cat > "${BENCH_DIR}/meta.json" << METAEOF
{
  "prompt": $(echo "$PROMPT" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read().strip()))"),
  "budget_usd": ${BUDGET},
  "model": "${MODEL}",
  "label": "${BENCH_LABEL}",
  "started_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "plugin_original": "code-forge",
  "plugin_rig": "code-forge-rig"
}
METAEOF

echo "=== Forge Bench ==="
echo "Prompt: ${PROMPT}"
echo "Budget: \$${BUDGET} per run"
echo "Model:  ${MODEL}"
echo "Output: ${BENCH_DIR}/"
echo ""

# --- Construct the forge invocation prompt ---
# We invoke /forge directly since it's the command entry point
FORGE_PROMPT="/forge ${PROMPT}"

# --- Common claude flags ---
CLAUDE_FLAGS=(
  --print
  --output-format json
  --model "${MODEL}"
  --max-budget-usd "${BUDGET}"
  --dangerously-skip-permissions
)

# --- Run original (code-forge) ---
echo "[$(date +%H:%M:%S)] Starting ORIGINAL run (code-forge)..."
(
  cd "${BENCH_DIR}/original"
  claude "${CLAUDE_FLAGS[@]}" \
    --plugin-dir "${PLUGIN_BASE}/code-forge" \
    "${FORGE_PROMPT}" \
    > session.json 2> stderr.log || true
  echo "[$(date +%H:%M:%S)] ORIGINAL run finished."
) &
PID_ORIGINAL=$!

# --- Run rig (code-forge-rig) ---
echo "[$(date +%H:%M:%S)] Starting RIG run (code-forge-rig)..."
(
  cd "${BENCH_DIR}/rig"
  claude "${CLAUDE_FLAGS[@]}" \
    --plugin-dir "${PLUGIN_BASE}/code-forge-rig" \
    "${FORGE_PROMPT}" \
    > session.json 2> stderr.log || true
  echo "[$(date +%H:%M:%S)] RIG run finished."
) &
PID_RIG=$!

# --- Wait for both ---
echo "[$(date +%H:%M:%S)] Both runs in progress. Waiting..."
echo ""

wait $PID_ORIGINAL
EXIT_ORIGINAL=$?

wait $PID_RIG
EXIT_RIG=$?

echo ""
echo "[$(date +%H:%M:%S)] Both runs complete."
echo "  Original exit: ${EXIT_ORIGINAL}"
echo "  Rig exit:      ${EXIT_RIG}"

# --- Run audits ---
echo ""
echo "Running protocol audits..."

AUDIT_ORIGINAL="null"
AUDIT_RIG="null"

if [[ -d "${BENCH_DIR}/original/.forge" ]]; then
  AUDIT_ORIGINAL=$(node "${SCRIPT_DIR}/forge-audit.mjs" "${BENCH_DIR}/original/.forge" 2>/dev/null || echo "null")
fi

if [[ -d "${BENCH_DIR}/rig/.forge" ]]; then
  AUDIT_RIG=$(node "${SCRIPT_DIR}/forge-audit.mjs" "${BENCH_DIR}/rig/.forge" 2>/dev/null || echo "null")
fi

# --- Extract session stats ---
extract_stats() {
  local session_file="$1"
  if [[ -f "$session_file" ]]; then
    python3 -c "
import json, sys
try:
    d = json.load(open('$session_file'))
    print(json.dumps({
        'cost_usd': d.get('total_cost_usd', 0),
        'duration_ms': d.get('duration_ms', 0),
        'num_turns': d.get('num_turns', 0),
        'stop_reason': d.get('stop_reason', ''),
        'usage': d.get('usage', {}),
    }))
except: print('null')
" 2>/dev/null || echo "null"
  else
    echo "null"
  fi
}

STATS_ORIGINAL=$(extract_stats "${BENCH_DIR}/original/session.json")
STATS_RIG=$(extract_stats "${BENCH_DIR}/rig/session.json")

# --- Compose results ---
python3 -c "
import json, sys

meta = json.load(open('${BENCH_DIR}/meta.json'))
results = {
    'meta': meta,
    'finished_at': '$(date -u +%Y-%m-%dT%H:%M:%SZ)',
    'original': {
        'session': ${STATS_ORIGINAL},
        'audit': ${AUDIT_ORIGINAL},
        'exit_code': ${EXIT_ORIGINAL},
    },
    'rig': {
        'session': ${STATS_RIG},
        'audit': ${AUDIT_RIG},
        'exit_code': ${EXIT_RIG},
    },
}
json.dump(results, open('${BENCH_DIR}/results.json', 'w'), indent=2)
print(json.dumps(results, indent=2))
" > /dev/null 2>&1

echo ""
echo "=== Results saved to ${BENCH_DIR}/results.json ==="

# --- Quick summary ---
echo ""
echo "=== Quick Summary ==="

python3 -c "
import json
r = json.load(open('${BENCH_DIR}/results.json'))

def fmt(variant):
    v = r[variant]
    audit = v.get('audit')
    session = v.get('session')
    score = audit.get('overallScore', 'N/A') if audit else 'N/A'
    cost = f\"\${session.get('cost_usd', 0):.2f}\" if session else 'N/A'
    turns = session.get('num_turns', 'N/A') if session else 'N/A'
    cycles = audit.get('totalCycles', 0) if audit else 0
    return f'Score: {score}  Cost: {cost}  Turns: {turns}  Cycles: {cycles}'

print(f'  Original: {fmt(\"original\")}')
print(f'  Rig:      {fmt(\"rig\")}')
" 2>/dev/null || echo "  (Could not parse results)"

echo ""
echo "Run '/forge-compare ${BENCH_DIR}' for detailed comparison."
