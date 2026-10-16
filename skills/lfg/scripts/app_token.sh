#!/usr/bin/env bash
# Mint a short-lived installation token for the /lfg reviewer GitHub App, so reviews and
# approvals land as "<app-slug>[bot]" instead of the PR author (who cannot self-approve).
# Config: ${LFG_REVIEWER_APP_ENV:-~/.config/lfg/reviewer-app.env}, sourced, must set
#   LFG_REVIEWER_APP_ID=<App ID (numeric) or Client ID; used as the JWT "iss">
#   LFG_REVIEWER_APP_KEY=<absolute path to the App private key .pem, mode 600>
# Usage:
#   app_token.sh --configured            # exit 0 if the config file exists and is valid
#   app_token.sh --login                 # print the bot login, e.g. "my-reviewer[bot]"
#   app_token.sh <owner> <repo>          # print an installation token scoped to that one repo
# Exit codes: 0 ok · 1 not configured (no config file) · 2 usage
#             3 config or API error · 4 HTTP 404 (App not installed on the repo, or unknown App ID)
# Uses curl, not `gh api`: gh would inject the user's own Authorization header. The JWT
# goes to curl through a process-substitution header file, never argv.
set -euo pipefail

CONFIG="${LFG_REVIEWER_APP_ENV:-$HOME/.config/lfg/reviewer-app.env}"
API="https://api.github.com"

die() { echo "app_token.sh: $*" >&2; exit 3; }

load_config() {  # returns 1 only when there is no config file; a broken one dies (exit 3)
  [[ -f "$CONFIG" ]] || return 1
  # Dry-run the source in a subshell first: under set -eu a failing line or an unset
  # variable would exit this script with its own code (1/2) and look like "not configured".
  # shellcheck disable=SC1090
  ( source "$CONFIG" ) > /dev/null 2>&1 \
    || die "cannot source $CONFIG (syntax error, failing command, or unset variable)"
  # shellcheck disable=SC1090
  source "$CONFIG"
  [[ -n "${LFG_REVIEWER_APP_ID:-}" ]] || die "LFG_REVIEWER_APP_ID is empty in $CONFIG"
  [[ -r "${LFG_REVIEWER_APP_KEY:-}" ]] || die "LFG_REVIEWER_APP_KEY is not a readable file: '${LFG_REVIEWER_APP_KEY:-}' (use an absolute path)"
}

b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }

jwt() {  # RS256 app JWT, valid 9 min, iat backdated 60 s for clock drift
  local now header payload unsigned sig
  now="$(date +%s)"
  header="$(printf '{"alg":"RS256","typ":"JWT"}' | b64url)"
  payload="$(printf '{"iat":%d,"exp":%d,"iss":"%s"}' "$((now - 60))" "$((now + 540))" "$LFG_REVIEWER_APP_ID" | b64url)"
  unsigned="$header.$payload"
  sig="$(printf '%s' "$unsigned" | openssl dgst -sha256 -sign "$LFG_REVIEWER_APP_KEY" -binary | b64url)" \
    && [[ -n "$sig" ]] || die "JWT signing failed with key $LFG_REVIEWER_APP_KEY"
  printf '%s.%s' "$unsigned" "$sig"
}

gh_app() {  # gh_app <METHOD> <path> [json-body]
  local tok out code
  tok="$(jwt)" || exit 3
  out="$(curl -sS -w '\n%{http_code}' -X "$1" "$API$2" \
    -H @<(printf 'Authorization: Bearer %s\n' "$tok") \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    ${3:+-d "$3"})" || die "$1 $2 -> curl failed"
  code="${out##*$'\n'}"; out="${out%$'\n'*}"
  if [[ "$code" != 2* ]]; then
    echo "app_token.sh: $1 $2 -> HTTP $code: $(jq -r '.message // .' <<<"$out" 2>/dev/null || printf '%.200s' "$out")" >&2
    [[ "$code" == 404 ]] && exit 4
    exit 3
  fi
  printf '%s' "$out"
}

case "${1:-}" in
  --configured)
    load_config ;;
  --login)
    load_config || die "not configured ($CONFIG)"
    gh_app GET /app | jq -er '.slug + "[bot]"' ;;
  ""|-*)
    echo "usage: app_token.sh --configured | --login | <owner> <repo>" >&2; exit 2 ;;
  *)
    owner="$1"; repo="${2:?usage: app_token.sh <owner> <repo>}"
    load_config || die "not configured ($CONFIG)"
    resp="$(gh_app GET "/repos/$owner/$repo/installation")"   # exit 4 = not installed
    inst="$(jq -er .id <<<"$resp")" || die "no installation id for $owner/$repo"
    # Scope the token down to this repo and the two permissions a reviewer needs.
    body="$(jq -nc --arg r "$repo" '{repositories:[$r], permissions:{pull_requests:"write", contents:"read"}}')"
    resp="$(gh_app POST "/app/installations/$inst/access_tokens" "$body")"
    jq -er .token <<<"$resp" || die "no token in the access_tokens response" ;;
esac
