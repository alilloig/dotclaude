#!/usr/bin/env bash
set -euo pipefail

# forge-bench — Run the same prompt through two forge plugin variants in parallel
#
# Usage: forge-bench.sh "<prompt>" [--model <model>] [--label <name>]
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
MODEL="opus"
LABEL=""

# --- Parse args ---
PROMPT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --model) MODEL="$2"; shift 2 ;;
    --label) LABEL="$2"; shift 2 ;;
    *) PROMPT="$1"; shift ;;
  esac
done

if [[ -z "$PROMPT" ]]; then
  echo "Usage: forge-bench.sh \"<prompt>\" [--model <model>] [--label <name>]"
  exit 1
fi

# --- Setup benchmark directory ---
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BENCH_LABEL="${LABEL:-bench-${TIMESTAMP}}"
BENCH_DIR=".forge-bench/${BENCH_LABEL}"

# --- Setup project directories in working directory ---
# Projects are created at ./forge/ and ./forge-rig/ for easy access.
# If they already exist, suffix with timestamp to avoid conflicts.
DIR_ORIGINAL="forge"
DIR_RIG="forge-rig"
if [[ -d "$DIR_ORIGINAL" ]]; then
  DIR_ORIGINAL="forge-${TIMESTAMP}"
  echo "Warning: forge/ exists, using ${DIR_ORIGINAL}/ instead"
fi
if [[ -d "$DIR_RIG" ]]; then
  DIR_RIG="forge-rig-${TIMESTAMP}"
  echo "Warning: forge-rig/ exists, using ${DIR_RIG}/ instead"
fi

ABS_DIR_ORIGINAL="$(pwd)/${DIR_ORIGINAL}"
ABS_DIR_RIG="$(pwd)/${DIR_RIG}"

mkdir -p "${BENCH_DIR}" "${DIR_ORIGINAL}" "${DIR_RIG}"

# Save the prompt
echo "$PROMPT" > "${BENCH_DIR}/prompt.txt"

# Save benchmark metadata
cat > "${BENCH_DIR}/meta.json" << METAEOF
{
  "prompt": $(echo "$PROMPT" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read().strip()))"),
  "model": "${MODEL}",
  "label": "${BENCH_LABEL}",
  "started_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "plugin_original": "code-forge",
  "plugin_rig": "code-forge-rig",
  "dir_original": "${DIR_ORIGINAL}",
  "dir_rig": "${DIR_RIG}"
}
METAEOF

echo "=== Forge Bench ==="
echo "Prompt: ${PROMPT}"
echo "Model:  ${MODEL}"
echo "Projects: ${DIR_ORIGINAL}/ and ${DIR_RIG}/"
echo "Metadata: ${BENCH_DIR}/"
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
CHANNEL_ORIG=""
CHANNEL_RIG=""
PANE_ORIG=""
PANE_RIG=""

if command -v tmux &>/dev/null && tmux list-sessions &>/dev/null; then
  USE_TMUX=true
  # If inside tmux, use current session; otherwise pick the first available session
  if [[ -n "${TMUX:-}" ]]; then
    TMUX_SESSION=$(tmux display-message -p '#S')
  else
    TMUX_SESSION=$(tmux list-sessions -F '#S' | head -1)
  fi
  CHANNEL_ORIG="fb-${TIMESTAMP}-orig"
  CHANNEL_RIG="fb-${TIMESTAMP}-rig"
fi

# --- Cleanup trap ---
cleanup() {
  if [[ "$USE_TMUX" == "true" ]]; then
    tmux wait-for -S "${CHANNEL_ORIG}" 2>/dev/null || true
    tmux wait-for -S "${CHANNEL_RIG}" 2>/dev/null || true
    [[ -n "$PANE_ORIG" ]] && tmux kill-pane -t "$PANE_ORIG" 2>/dev/null || true
    [[ -n "$PANE_RIG" ]] && tmux kill-pane -t "$PANE_RIG" 2>/dev/null || true
  fi
}
trap cleanup INT TERM

if [[ "$USE_TMUX" == "true" ]]; then
  # =============================================
  # TMUX MODE: visible side-by-side panes
  # =============================================

  # --- Write forge prompts to files ---
  # Avoids shell quoting issues when embedding in wrapper scripts.
  echo "$FORGE_PROMPT_ORIGINAL" > "${DIR_ORIGINAL}/.forge_prompt"
  echo "$FORGE_PROMPT_RIG" > "${DIR_RIG}/.forge_prompt"

  # --- Generate per-run wrapper scripts ---
  for VARIANT in original rig; do
    if [[ "$VARIANT" == "original" ]]; then
      CHANNEL="$CHANNEL_ORIG"
      LABEL_UPPER="ORIGINAL"
    else
      CHANNEL="$CHANNEL_RIG"
      LABEL_UPPER="RIG"
    fi

    if [[ "$VARIANT" == "original" ]]; then
      RUN_DIR="${DIR_ORIGINAL}"
      ABS_RUN_DIR="${ABS_DIR_ORIGINAL}"
    else
      RUN_DIR="${DIR_RIG}"
      ABS_RUN_DIR="${ABS_DIR_RIG}"
    fi

    cat > "${RUN_DIR}/run.sh" << WRAPPER_EOF
#!/usr/bin/env bash
set -uo pipefail

LABEL_UPPER="${LABEL_UPPER}"
RUN_DIR="${ABS_RUN_DIR}"
CHANNEL="${CHANNEL}"
MODEL="${MODEL}"

cd "\${RUN_DIR}"

FORGE_PROMPT=\$(cat .forge_prompt)

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  Forge Bench: \${LABEL_UPPER}"
echo "║  Started: \$(date)"
echo "╚══════════════════════════════════════════╝"
echo ""

# Run claude interactively — user can watch and interact in this pane
EXIT_CODE=0
START_TS=\$(date +%s)

claude \\
  --permission-mode bypassPermissions \\
  --model "\${MODEL}" \\
  "\${FORGE_PROMPT}" || EXIT_CODE=\$?

END_TS=\$(date +%s)
DURATION_MS=\$(( (END_TS - START_TS) * 1000 ))

# Write minimal session.json with what we can measure
python3 -c "
import json
json.dump({
    'duration_ms': \${DURATION_MS},
    'num_turns': 0,
    'stop_reason': 'end_turn',
    'usage': {}
}, open('session.json', 'w'))
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

    chmod +x "${RUN_DIR}/run.sh"
  done

  # --- Split the active window to add forge panes alongside ---
  # Find the active window in the target session
  ACTIVE_WINDOW=$(tmux display-message -t "${TMUX_SESSION}" -p '#I')

  echo "[$(date +%H:%M:%S)] Splitting current window into forge panes..."

  # Split the active window horizontally — ORIGINAL pane appears on the right
  PANE_ORIG=$(tmux split-window -h -t "${TMUX_SESSION}:${ACTIVE_WINDOW}" \
    -P -F '#{pane_id}' \
    "bash '${ABS_DIR_ORIGINAL}/run.sh'")

  # Split the ORIGINAL pane vertically — RIG pane appears below it
  PANE_RIG=$(tmux split-window -v -t "$PANE_ORIG" \
    -P -F '#{pane_id}' \
    "bash '${ABS_DIR_RIG}/run.sh'")

  # Label panes with titles
  tmux select-pane -t "$PANE_ORIG" -T "ORIGINAL (code-forge)"
  tmux select-pane -t "$PANE_RIG" -T "RIG (code-forge-rig)"
  tmux set-option -t "${TMUX_SESSION}:${ACTIVE_WINDOW}" pane-border-format " #{pane_title} " 2>/dev/null || true
  tmux set-option -t "${TMUX_SESSION}:${ACTIVE_WINDOW}" pane-border-status top 2>/dev/null || true

  echo "[$(date +%H:%M:%S)] Both runs in progress alongside your session."
  echo ""
  echo "[$(date +%H:%M:%S)] Waiting for both runs to complete..."
  echo ""

  # --- Wait for both via tmux channels ---
  tmux wait-for "${CHANNEL_ORIG}"
  EXIT_ORIGINAL=$(cat "${DIR_ORIGINAL}/.exit_code" 2>/dev/null || echo "1")
  echo "[$(date +%H:%M:%S)] ORIGINAL run finished (exit ${EXIT_ORIGINAL})"

  tmux wait-for "${CHANNEL_RIG}"
  EXIT_RIG=$(cat "${DIR_RIG}/.exit_code" 2>/dev/null || echo "1")
  echo "[$(date +%H:%M:%S)] RIG run finished (exit ${EXIT_RIG})"

  echo ""
  echo "[$(date +%H:%M:%S)] Both runs complete."
  echo "  Original exit: ${EXIT_ORIGINAL}"
  echo "  Rig exit:      ${EXIT_RIG}"

  # Kill only the forge panes (not the whole window) and clean up
  tmux kill-pane -t "$PANE_ORIG" 2>/dev/null || true
  tmux kill-pane -t "$PANE_RIG" 2>/dev/null || true
  rm -f "${DIR_ORIGINAL}/run.sh" "${DIR_RIG}/run.sh"
  rm -f "${DIR_ORIGINAL}/.forge_prompt" "${DIR_RIG}/.forge_prompt"
  rm -f "${DIR_ORIGINAL}/.exit_code" "${DIR_RIG}/.exit_code"

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
    --dangerously-skip-permissions
    --append-system-prompt "${AUTONOMOUS_PROMPT}"
  )

  echo "[$(date +%H:%M:%S)] Starting ORIGINAL run (code-forge)..."
  (
    cd "${DIR_ORIGINAL}"
    claude "${CLAUDE_FLAGS[@]}" \
      "${FORGE_PROMPT_ORIGINAL}" \
      > session.json 2> stderr.log || true
    echo "[$(date +%H:%M:%S)] ORIGINAL run finished."
  ) &
  PID_ORIGINAL=$!

  echo "[$(date +%H:%M:%S)] Starting RIG run (code-forge-rig)..."
  (
    cd "${DIR_RIG}"
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

if [[ -d "${DIR_ORIGINAL}/.forge" ]]; then
  AUDIT_ORIGINAL=$(node "${SCRIPT_DIR}/forge-audit.mjs" "${DIR_ORIGINAL}/.forge" 2>/dev/null || echo "null")
fi

if [[ -d "${DIR_RIG}/.forge" ]]; then
  AUDIT_RIG=$(node "${SCRIPT_DIR}/forge-audit.mjs" "${DIR_RIG}/.forge" 2>/dev/null || echo "null")
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

STATS_ORIGINAL=$(extract_stats "${DIR_ORIGINAL}/session.json")
STATS_RIG=$(extract_stats "${DIR_RIG}/session.json")

# --- Collect code statistics ---
extract_code_stats() {
  local project_dir="$1"
  if [[ -d "$project_dir" ]]; then
    python3 -c "
import os, json

project_dir = '$project_dir'
EXCLUDE_DIRS = {'.forge', '.remember', 'node_modules', '.git', '__pycache__', '.next', 'target', 'build', 'dist'}
EXCLUDE_FILES = {'session.json', 'stderr.log', 'package-lock.json', 'run.sh', '.forge_prompt', '.exit_code'}

files = []
total_lines = 0
extensions = {}

for root, dirs, filenames in os.walk(project_dir):
    dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
    rel_root = os.path.relpath(root, project_dir)
    for f in filenames:
        if f in EXCLUDE_FILES or f.startswith('.'):
            continue
        rel_path = os.path.join(rel_root, f) if rel_root != '.' else f
        full_path = os.path.join(root, f)
        try:
            size = os.path.getsize(full_path)
            with open(full_path, 'r', errors='ignore') as fh:
                lines = sum(1 for _ in fh)
        except:
            size = 0
            lines = 0
        ext = os.path.splitext(f)[1] or '(none)'
        extensions[ext] = extensions.get(ext, 0) + 1
        total_lines += lines
        files.append({'path': rel_path, 'size': size, 'lines': lines})

files.sort(key=lambda x: x['path'])
top_dirs = sorted([d for d in os.listdir(project_dir)
                   if os.path.isdir(os.path.join(project_dir, d))
                   and d not in EXCLUDE_DIRS and not d.startswith('.')])

print(json.dumps({
    'file_count': len(files),
    'total_lines': total_lines,
    'extensions': extensions,
    'top_level_dirs': top_dirs,
    'files': files,
}))
" 2>/dev/null || echo "null"
  else
    echo "null"
  fi
}

echo "Collecting code statistics..."
CODE_STATS_ORIGINAL=$(extract_code_stats "${DIR_ORIGINAL}")
CODE_STATS_RIG=$(extract_code_stats "${DIR_RIG}")

# --- Compose results ---
# Write JSON inputs as temp files to avoid shell interpolation issues
# with large JSON payloads containing special characters.
echo "${STATS_ORIGINAL}" > "${BENCH_DIR}/_stats_original.json"
echo "${STATS_RIG}" > "${BENCH_DIR}/_stats_rig.json"
echo "${AUDIT_ORIGINAL}" > "${BENCH_DIR}/_audit_original.json"
echo "${AUDIT_RIG}" > "${BENCH_DIR}/_audit_rig.json"
echo "${CODE_STATS_ORIGINAL}" > "${BENCH_DIR}/_code_stats_original.json"
echo "${CODE_STATS_RIG}" > "${BENCH_DIR}/_code_stats_rig.json"

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
        'code_stats': load_json_file(f'{bench_dir}/_code_stats_original.json'),
        'exit_code': ${EXIT_ORIGINAL},
    },
    'rig': {
        'session': load_json_file(f'{bench_dir}/_stats_rig.json'),
        'audit': load_json_file(f'{bench_dir}/_audit_rig.json'),
        'code_stats': load_json_file(f'{bench_dir}/_code_stats_rig.json'),
        'exit_code': ${EXIT_RIG},
    },
}
json.dump(results, open(f'{bench_dir}/results.json', 'w'), indent=2)
print('results.json written')
"

# Clean up temp files
rm -f "${BENCH_DIR}/_stats_original.json" "${BENCH_DIR}/_stats_rig.json" \
      "${BENCH_DIR}/_audit_original.json" "${BENCH_DIR}/_audit_rig.json" \
      "${BENCH_DIR}/_code_stats_original.json" "${BENCH_DIR}/_code_stats_rig.json"

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
    turns = session.get('num_turns', 'N/A') if session else 'N/A'
    cycles = audit.get('totalCycles', 0) if audit else 0
    code = v.get('code_stats')
    files = code.get('file_count', '?') if code else '?'
    loc = code.get('total_lines', '?') if code else '?'
    return f'Score: {score}  Turns: {turns}  Cycles: {cycles}  Files: {files}  LOC: {loc}'

print(f'  Original: {fmt(\"original\")}')
print(f'  Rig:      {fmt(\"rig\")}')
" 2>/dev/null || echo "  (Could not parse results)"

echo ""
echo "Run '/forge-compare ${BENCH_DIR}' for detailed comparison."
