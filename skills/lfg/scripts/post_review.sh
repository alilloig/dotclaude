#!/usr/bin/env bash
# Post a PR review with inline suggestions via the GitHub reviews API.
# When the reviewer GitHub App is configured (see app_token.sh), the review posts as
# "<app-slug>[bot]". It falls back to the gh user only when there is no config, or the
# App is not installed on the repo; any other App error stops the post. As the gh user
# only COMMENT is allowed (GitHub rejects APPROVE / REQUEST_CHANGES from the PR author).
# APPROVE / REQUEST_CHANGES also need --verdict, which only /lfg Phase 4 step 7 passes —
# review tracks (Phase 3, the Codex orchestrator) post COMMENT only.
# Usage:
#   post_review.sh [--verdict] <owner> <repo> <pr_number> <payload.json>   # posts the review
#   post_review.sh --check <payload.json>                                  # validates payload only, no network
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ "${1:-}" == "--check" ]]; then
  payload="${2:?usage: post_review.sh --check <payload.json>}"
  # Payload must be valid JSON with a known event + comments[] each having path/line/side/body.
  jq -e '
    (.event | IN("COMMENT", "APPROVE", "REQUEST_CHANGES")) and
    (.body  | type == "string") and
    (.comments | type == "array") and
    (all(.comments[]; (.path|type=="string") and (.line|type=="number") and (.side|type=="string") and (.body|type=="string")))
  ' "$payload" > /dev/null
  echo "CHECK OK: $payload"
  exit 0
fi

verdict=0
[[ "${1:-}" == "--verdict" ]] && { verdict=1; shift; }
owner="${1:?owner}"; repo="${2:?repo}"; pr="${3:?pr_number}"; payload="${4:?payload.json}"
bash "$0" --check "$payload"   # validate before sending
event="$(jq -r .event "$payload")"
if [[ "$event" != "COMMENT" && "$verdict" != 1 ]]; then
  echo "post_review.sh: $event needs --verdict (only /lfg Phase 4 step 7 posts a verdict)" >&2
  exit 1
fi

as="gh user"
rc=0; bash "$SCRIPT_DIR/app_token.sh" --configured || rc=$?
case "$rc" in
  0)
    trc=0; token="$(bash "$SCRIPT_DIR/app_token.sh" "$owner" "$repo")" || trc=$?
    case "$trc" in
      0) export GH_TOKEN="$token"
         as="$(bash "$SCRIPT_DIR/app_token.sh" --login 2>/dev/null || echo "reviewer App")" ;;
      4) echo "post_review.sh: reviewer App not installed on ${owner}/${repo} — posting as the gh user" >&2 ;;
      *) echo "post_review.sh: reviewer App token failed for ${owner}/${repo} (exit $trc) — not posting" >&2
         exit 1 ;;
    esac ;;
  1) ;;  # no App config: post as the gh user
  *) echo "post_review.sh: reviewer App config is broken (exit $rc) — not posting" >&2
     exit 1 ;;
esac
if [[ "$as" == "gh user" && "$event" != "COMMENT" ]]; then
  echo "post_review.sh: only COMMENT can post as the PR author — APPROVE/REQUEST_CHANGES need the reviewer App" >&2
  exit 1
fi

gh api -X POST "repos/${owner}/${repo}/pulls/${pr}/reviews" --input "$payload" > /dev/null
echo "POSTED ${event} review to ${owner}/${repo}#${pr} as ${as}"
