#!/usr/bin/env bash
# Durable per-run orchestrator state for /lfg — records who the lead is and how far
# the run got, so a daemon respawn that drops conversation context can recover
# (see references/incident-2026-07-07-identity-swap.md).
# Usage:
#   run_state.sh init <RUN_DIR> [--force]      # create <RUN_DIR>/state.json as {"phase":"preflight"};
#                                              #   refuses if an in-flight state exists (phase not
#                                              #   complete/aborted) unless --force
#   run_state.sh set  <RUN_DIR> <key> <value>  # update one key (atomic: write tmp file, then mv)
#   run_state.sh get  <RUN_DIR> [key]          # print whole JSON, or one key's raw value
# Keys:   phase pr_number base_ref head_ref roster consolidator run_token repo_root skill_dir review_mode quiz_gate
#         ("roster" takes a comma-separated list, stored as a JSON array)
# Phases: preflight|shipped|simplified|review-dispatched|review-posted|adjudicated|quiz-passed|complete|aborted
# Exits non-zero on: unknown key, unknown phase value, missing state file, missing key,
#                    init over an in-flight run without --force.
set -euo pipefail

ALLOWED_KEYS="phase pr_number base_ref head_ref roster consolidator run_token repo_root skill_dir review_mode quiz_gate"
ALLOWED_PHASES="preflight shipped simplified review-dispatched review-posted adjudicated quiz-passed complete aborted"

die() { echo "run_state.sh: $*" >&2; exit 1; }

usage() {
  echo "usage: run_state.sh init <RUN_DIR> | set <RUN_DIR> <key> <value> | get <RUN_DIR> [key]" >&2
  exit 2
}

atomic_write() {  # atomic_write <state_file> <json>
  local state_file="$1" json="$2" tmp
  tmp="$(mktemp "${state_file}.XXXXXX")"
  printf '%s\n' "$json" > "$tmp"
  mv "$tmp" "$state_file"
}

cmd="${1:-}"
case "$cmd" in
  init)
    run_dir="${2:?usage: run_state.sh init <RUN_DIR> [--force]}"
    force="${3:-}"
    state="$run_dir/state.json"
    if [[ -f "$state" && "$force" != "--force" ]]; then
      phase="$(jq -r '.phase // empty' "$state" 2>/dev/null || true)"
      case "$phase" in
        ""|complete|aborted) ;;  # terminal or corrupt — safe to re-seed
        *) die "run in flight in $run_dir (phase: $phase) — use the wake guard, or init --force" ;;
      esac
    fi
    mkdir -p "$run_dir"
    [[ -O "$run_dir" ]] || die "$run_dir is not owned by the current user — refusing to seed run state there"
    chmod 700 "$run_dir"
    atomic_write "$state" '{"phase":"preflight"}'
    ;;
  set)
    run_dir="${2:?usage: run_state.sh set <RUN_DIR> <key> <value>}"
    key="${3:?usage: run_state.sh set <RUN_DIR> <key> <value>}"
    value="${4:?usage: run_state.sh set <RUN_DIR> <key> <value>}"
    [[ $# -eq 4 ]] || die "expected exactly one <value> — quote values containing spaces"
    state="$run_dir/state.json"
    [[ -f "$state" ]] || die "no state.json in $run_dir (run 'init' first)"
    case " $ALLOWED_KEYS " in
      *" $key "*) [[ "$key" != *" "* ]] || die "unknown key: $key (allowed: $ALLOWED_KEYS)" ;;
      *) die "unknown key: $key (allowed: $ALLOWED_KEYS)" ;;
    esac
    if [[ "$key" == "phase" ]]; then
      case " $ALLOWED_PHASES " in
        *" $value "*) [[ "$value" != *" "* ]] || die "unknown phase: $value (allowed: $ALLOWED_PHASES)" ;;
        *) die "unknown phase: $value (allowed: $ALLOWED_PHASES)" ;;
      esac
    fi
    if [[ "$key" == "pr_number" && ! "$value" =~ ^[0-9]+$ ]]; then
      die "pr_number must be numeric (got: $value)"
    fi
    if [[ "$key" == "review_mode" && "$value" != "agents" && "$value" != "codex" && "$value" != "super" ]]; then
      die "review_mode must be agents|codex|super (got: $value)"
    fi
    if [[ "$key" == "quiz_gate" && "$value" != "on" && "$value" != "off" ]]; then
      die "quiz_gate must be on|off (got: $value)"
    fi
    if [[ "$key" == "roster" ]]; then
      new="$(jq -c --arg v "$value" \
        '.roster = ($v | split(",") | map(gsub("^\\s+|\\s+$"; "")))' "$state")"
    else
      new="$(jq -c --arg k "$key" --arg v "$value" '.[$k] = $v' "$state")"
    fi
    atomic_write "$state" "$new"
    ;;
  get)
    run_dir="${2:?usage: run_state.sh get <RUN_DIR> [key]}"
    state="$run_dir/state.json"
    [[ -f "$state" ]] || die "no state.json in $run_dir"
    if [[ $# -ge 3 ]]; then
      key="$3"
      jq -e --arg k "$key" 'has($k)' "$state" > /dev/null || die "key not set: $key"
      jq -cr --arg k "$key" '.[$k]' "$state"
    else
      jq -c . "$state"
    fi
    ;;
  *)
    usage
    ;;
esac
