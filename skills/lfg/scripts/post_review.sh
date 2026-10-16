#!/usr/bin/env bash
# Post a PR review with inline suggestions via the GitHub reviews API.
# When the reviewer GitHub App is configured (see app_token.sh), the review posts as
# "<app-slug>[bot]"; otherwise it posts as the gh user and only COMMENT is allowed
# (GitHub rejects APPROVE / REQUEST_CHANGES from the PR author).
# Usage:
#   post_review.sh <owner> <repo> <pr_number> <payload.json>   # posts the review
#   post_review.sh --check <payload.json>                      # validates payload only, no network
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

owner="${1:?owner}"; repo="${2:?repo}"; pr="${3:?pr_number}"; payload="${4:?payload.json}"
bash "$0" --check "$payload"   # validate before sending

as="gh user"
if bash "$SCRIPT_DIR/app_token.sh" --configured; then
  if token="$(bash "$SCRIPT_DIR/app_token.sh" "$owner" "$repo")"; then
    export GH_TOKEN="$token"
    as="$(bash "$SCRIPT_DIR/app_token.sh" --login)"
  else
    echo "post_review.sh: no App token for ${owner}/${repo} — falling back to the gh user" >&2
  fi
fi
if [[ "$as" == "gh user" && "$(jq -r .event "$payload")" != "COMMENT" ]]; then
  echo "post_review.sh: only COMMENT can post as the PR author — APPROVE/REQUEST_CHANGES need the reviewer App" >&2
  exit 1
fi

gh api -X POST "repos/${owner}/${repo}/pulls/${pr}/reviews" --input "$payload"
echo "POSTED $(jq -r .event "$payload") review to ${owner}/${repo}#${pr} as ${as}"
