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
#
# When running inside tmux, both sessions appear in visible side-by-side panes.
# Otherwise, falls back to hidden background subshells.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

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
ABS_BENCH_DIR="$(pwd)/${BENCH_DIR}"

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

# --- Construct the forge invocation prompts ---
# Use fully qualified command names (plugin:command) so each session
# invokes the correct plugin variant. Both plugins are installed @local.
FORGE_PROMPT_ORIGINAL="/code-forge:forge ${PROMPT}"
FORGE_PROMPT_RIG="/code-forge-rig:forge ${PROMPT}"

# --- Autonomous system prompt ---
# Instructs the session to work fully autonomously since --print mode
# is headless and cannot handle AskUserQuestion.
AUTONOMOUS_PROMPT="You are running in headless benchmark mode. NEVER use AskUserQuestion — there is no user to answer. Make all decisions autonomously using reasonable defaults: prefer the recommended option when presented with choices, prefer PoC/prototype quality bar, and prefer mocking external services unless the prompt explicitly requires real integrations. Do not block on missing input — decide and proceed."

# --- Detect tmux ---
USE_TMUX=false
TMUX_SESSION=""
BENCH_WINDOW=""
CHANNEL_ORIG=""
CHANNEL_RIG=""

if command -v tmux &>/dev/null && [[ -n "${TMUX:-}" ]]; then
  USE_TMUX=true
  TMUX_SESSION=$(tmux display-message -p '#S')
  BENCH_WINDOW="forge-${BENCH_LABEL}"
  CHANNEL_ORIG="fb-${TIMESTAMP}-orig"
  CHANNEL_RIG="fb-${TIMESTAMP}-rig"
fi

# --- Cleanup trap ---
cleanup() {
  if [[ "$USE_TMUX" == "true" ]]; then
    tmux wait-for -S "${CHANNEL_ORIG}" 2>/dev/null || true
    tmux wait-for -S "${CHANNEL_RIG}" 2>/dev/null || true
    tmux kill-window -t "${TMUX_SESSION}:${BENCH_WINDOW}" 2>/dev/null || true
  fi
}
trap cleanup INT TERM

if [[ "$USE_TMUX" == "true" ]]; then
  # =============================================
  # TMUX MODE: visible side-by-side panes
  # =============================================

  # --- Write forge prompts and autonomous prompt to files ---
  # Avoids shell quoting issues when embedding in wrapper scripts.
  echo "$FORGE_PROMPT_ORIGINAL" > "${BENCH_DIR}/original/.forge_prompt"
  echo "$FORGE_PROMPT_RIG" > "${BENCH_DIR}/rig/.forge_prompt"
  echo "$AUTONOMOUS_PROMPT" > "${BENCH_DIR}/original/.autonomous_prompt"
  cp "${BENCH_DIR}/original/.autonomous_prompt" "${BENCH_DIR}/rig/.autonomous_prompt"

  # --- Generate per-run wrapper scripts ---
  for VARIANT in original rig; do
    if [[ "$VARIANT" == "original" ]]; then
      CHANNEL="$CHANNEL_ORIG"
      LABEL_UPPER="ORIGINAL"
    else
      CHANNEL="$CHANNEL_RIG"
      LABEL_UPPER="RIG"
    fi

    cat > "${BENCH_DIR}/${VARIANT}/run.sh" << WRAPPER_EOF
#!/usr/bin/env bash
set -uo pipefail

VARIANT="${VARIANT}"
LABEL_UPPER="${LABEL_UPPER}"
BENCH_DIR="${ABS_BENCH_DIR}"
CHANNEL="${CHANNEL}"
MODEL="${MODEL}"
BUDGET="${BUDGET}"

cd "\${BENCH_DIR}/\${VARIANT}"

FORGE_PROMPT=\$(cat .forge_prompt)
AUTONOMOUS_PROMPT=\$(cat .autonomous_prompt)

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  Forge Bench: \${LABEL_UPPER}"
echo "║  Started: \$(date)"
echo "╚══════════════════════════════════════════╝"
echo ""

# Run claude with stream-json, tee to file, display filtered output
EXIT_CODE=0
claude --print \\
  --output-format stream-json \\
  --verbose \\
  --model "\${MODEL}" \\
  --max-budget-usd "\${BUDGET}" \\
  --dangerously-skip-permissions \\
  --append-system-prompt "\${AUTONOMOUS_PROMPT}" \\
  "\${FORGE_PROMPT}" \\
  2> stderr.log \\
  | tee stream.jsonl \\
  | python3 -u -c '
import sys, json

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        evt = json.loads(line)
        t = evt.get("type", "")
        sub = evt.get("subtype", "")

        if t == "assistant":
            for block in evt.get("message", {}).get("content", []):
                bt = block.get("type", "")
                if bt == "text":
                    text = block.get("text", "")
                    for chunk in [text[i:i+300] for i in range(0, len(text), 300)]:
                        print(chunk)
                elif bt == "tool_use":
                    name = block.get("name", "?")
                    print(f"\033[36m[TOOL] {name}\033[0m")

        elif t == "result":
            cost = evt.get("total_cost_usd", 0)
            turns = evt.get("num_turns", "?")
            dur = evt.get("duration_ms", 0) // 1000
            stop = evt.get("stop_reason", "")
            print(f"\n\033[32m{chr(61)*40}\033[0m")
            print(f"\033[32mDONE  Cost: \${cost:.2f}  Turns: {turns}  Duration: {dur}s  Stop: {stop}\033[0m")
            print(f"\033[32m{chr(61)*40}\033[0m")

        elif t == "system" and sub == "init":
            sid = evt.get("session_id", "?")
            print(f"\033[90m[session {sid[:8]}...]\033[0m")

    except Exception:
        pass
    sys.stdout.flush()
' || EXIT_CODE=\$?

# Extract the result event from stream.jsonl -> session.json
python3 -c "
import json
last_result = None
for line in open('stream.jsonl'):
    line = line.strip()
    if not line: continue
    try:
        evt = json.loads(line)
        if evt.get('type') == 'result':
            last_result = evt
    except: pass
if last_result:
    json.dump(last_result, open('session.json', 'w'))
else:
    import sys
    print('WARNING: No result event found in stream', file=sys.stderr)
" 2>/dev/null

# Write exit code for parent
echo "\${EXIT_CODE}" > .exit_code

echo ""
echo "=== \${LABEL_UPPER} finished (exit \${EXIT_CODE}) ==="
echo "Waiting for bench to complete..."

# Signal the parent
tmux wait-for -S "\${CHANNEL}"

# Keep pane alive so user can read final output (parent kills window on cleanup)
sleep 86400 || true
WRAPPER_EOF

    chmod +x "${BENCH_DIR}/${VARIANT}/run.sh"
  done

  # --- Create tmux window with two panes ---
  echo "[$(date +%H:%M:%S)] Launching tmux panes..."

  tmux new-window -n "${BENCH_WINDOW}" -d \
    "bash '${ABS_BENCH_DIR}/original/run.sh'"

  tmux split-window -h -t "${TMUX_SESSION}:${BENCH_WINDOW}" \
    "bash '${ABS_BENCH_DIR}/rig/run.sh'"

  # Label panes with titles
  tmux select-pane -t "${TMUX_SESSION}:${BENCH_WINDOW}.0" -T "ORIGINAL (code-forge)"
  tmux select-pane -t "${TMUX_SESSION}:${BENCH_WINDOW}.1" -T "RIG (code-forge-rig)"
  tmux set-option -t "${TMUX_SESSION}:${BENCH_WINDOW}" pane-border-format " #{pane_title} " 2>/dev/null || true
  tmux set-option -t "${TMUX_SESSION}:${BENCH_WINDOW}" pane-border-status top 2>/dev/null || true

  echo "[$(date +%H:%M:%S)] Both runs in progress in tmux window '${BENCH_WINDOW}'"
  echo "  Switch to it:  tmux select-window -t '${BENCH_WINDOW}'"
  echo ""
  echo "[$(date +%H:%M:%S)] Waiting for both runs to complete..."
  echo ""

  # --- Wait for both via tmux channels ---
  tmux wait-for "${CHANNEL_ORIG}"
  EXIT_ORIGINAL=$(cat "${BENCH_DIR}/original/.exit_code" 2>/dev/null || echo "1")
  echo "[$(date +%H:%M:%S)] ORIGINAL run finished (exit ${EXIT_ORIGINAL})"

  tmux wait-for "${CHANNEL_RIG}"
  EXIT_RIG=$(cat "${BENCH_DIR}/rig/.exit_code" 2>/dev/null || echo "1")
  echo "[$(date +%H:%M:%S)] RIG run finished (exit ${EXIT_RIG})"

  echo ""
  echo "[$(date +%H:%M:%S)] Both runs complete."
  echo "  Original exit: ${EXIT_ORIGINAL}"
  echo "  Rig exit:      ${EXIT_RIG}"

  # Kill the benchmark window and clean up ephemeral files
  tmux kill-window -t "${TMUX_SESSION}:${BENCH_WINDOW}" 2>/dev/null || true
  rm -f "${BENCH_DIR}/original/run.sh" "${BENCH_DIR}/rig/run.sh"
  rm -f "${BENCH_DIR}/original/.forge_prompt" "${BENCH_DIR}/rig/.forge_prompt"
  rm -f "${BENCH_DIR}/original/.autonomous_prompt" "${BENCH_DIR}/rig/.autonomous_prompt"

else
  # =============================================
  # FALLBACK MODE: hidden background subshells
  # =============================================
  if command -v tmux &>/dev/null; then
    echo "(Not inside tmux — falling back to background mode. Run inside tmux for visible panes.)"
  else
    echo "(tmux not found — running in background mode.)"
  fi
  echo ""

  CLAUDE_FLAGS=(
    --print
    --output-format json
    --model "${MODEL}"
    --max-budget-usd "${BUDGET}"
    --dangerously-skip-permissions
    --append-system-prompt "${AUTONOMOUS_PROMPT}"
  )

  echo "[$(date +%H:%M:%S)] Starting ORIGINAL run (code-forge)..."
  (
    cd "${BENCH_DIR}/original"
    claude "${CLAUDE_FLAGS[@]}" \
      "${FORGE_PROMPT_ORIGINAL}" \
      > session.json 2> stderr.log || true
    echo "[$(date +%H:%M:%S)] ORIGINAL run finished."
  ) &
  PID_ORIGINAL=$!

  echo "[$(date +%H:%M:%S)] Starting RIG run (code-forge-rig)..."
  (
    cd "${BENCH_DIR}/rig"
    claude "${CLAUDE_FLAGS[@]}" \
      "${FORGE_PROMPT_RIG}" \
      > session.json 2> stderr.log || true
    echo "[$(date +%H:%M:%S)] RIG run finished."
  ) &
  PID_RIG=$!

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
fi

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
# Write JSON inputs as temp files to avoid shell interpolation issues
# with large JSON payloads containing special characters.
echo "${STATS_ORIGINAL}" > "${BENCH_DIR}/_stats_original.json"
echo "${STATS_RIG}" > "${BENCH_DIR}/_stats_rig.json"
echo "${AUDIT_ORIGINAL}" > "${BENCH_DIR}/_audit_original.json"
echo "${AUDIT_RIG}" > "${BENCH_DIR}/_audit_rig.json"

python3 -c "
import json, sys

bench_dir = '${BENCH_DIR}'
meta = json.load(open(f'{bench_dir}/meta.json'))

def load_json_file(path):
    try:
        return json.load(open(path))
    except:
        return None

results = {
    'meta': meta,
    'finished_at': '$(date -u +%Y-%m-%dT%H:%M:%SZ)',
    'original': {
        'session': load_json_file(f'{bench_dir}/_stats_original.json'),
        'audit': load_json_file(f'{bench_dir}/_audit_original.json'),
        'exit_code': ${EXIT_ORIGINAL},
    },
    'rig': {
        'session': load_json_file(f'{bench_dir}/_stats_rig.json'),
        'audit': load_json_file(f'{bench_dir}/_audit_rig.json'),
        'exit_code': ${EXIT_RIG},
    },
}
json.dump(results, open(f'{bench_dir}/results.json', 'w'), indent=2)
print('results.json written')
"

# Clean up temp files
rm -f "${BENCH_DIR}/_stats_original.json" "${BENCH_DIR}/_stats_rig.json" \
      "${BENCH_DIR}/_audit_original.json" "${BENCH_DIR}/_audit_rig.json"

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
