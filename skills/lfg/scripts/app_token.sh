#!/usr/bin/env bash
# Mint a short-lived installation token for the /lfg reviewer GitHub App, so reviews and
# approvals land as "<app-slug>[bot]" instead of the PR author (who cannot self-approve).
# Config: ${LFG_REVIEWER_APP_ENV:-~/.config/lfg/reviewer-app.env}, sourced, must set
#   LFG_REVIEWER_APP_ID=<numeric App ID>
#   LFG_REVIEWER_APP_KEY=<absolute path to the App private key .pem, mode 600>
# Usage:
#   app_token.sh --configured            # exit 0 if the config file exists and names a readable key
#   app_token.sh --login                 # print the bot login, e.g. "my-reviewer[bot]"
#   app_token.sh <owner> <repo>          # print an installation token scoped to that one repo
# Uses curl, not `gh api`: gh would inject the user's own Authorization header.
set -euo pipefail

CONFIG="${LFG_REVIEWER_APP_ENV:-$HOME/.config/lfg/reviewer-app.env}"
API="https://api.github.com"

die() { echo "app_token.sh: $*" >&2; exit 1; }

load_config() {
  [[ -f "$CONFIG" ]] || return 1
  # shellcheck disable=SC1090
  source "$CONFIG"
  [[ -n "${LFG_REVIEWER_APP_ID:-}" && -r "${LFG_REVIEWER_APP_KEY:-}" ]]
}

b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }

jwt() {  # RS256 app JWT, valid 9 min, iat backdated 60 s for clock drift
  local now header payload unsigned sig
  now="$(date +%s)"
  header="$(printf '{"alg":"RS256","typ":"JWT"}' | b64url)"
  payload="$(printf '{"iat":%d,"exp":%d,"iss":"%s"}' "$((now - 60))" "$((now + 540))" "$LFG_REVIEWER_APP_ID" | b64url)"
  unsigned="$header.$payload"
  sig="$(printf '%s' "$unsigned" | openssl dgst -sha256 -sign "$LFG_REVIEWER_APP_KEY" -binary | b64url)"
  printf '%s.%s' "$unsigned" "$sig"
}

gh_app() {  # gh_app <METHOD> <path> [json-body]
  local out code
  out="$(curl -sS -w '\n%{http_code}' -X "$1" "$API$2" \
    -H "Authorization: Bearer $(jwt)" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    ${3:+-d "$3"})"
  code="${out##*$'\n'}"; out="${out%$'\n'*}"
  [[ "$code" == 2* ]] || die "$1 $2 -> HTTP $code: $(jq -r '.message // .' <<<"$out" 2>/dev/null)"
  printf '%s' "$out"
}

case "${1:-}" in
  --configured)
    load_config ;;
  --login)
    load_config || die "not configured ($CONFIG)"
    gh_app GET /app | jq -r '.slug + "[bot]"' ;;
  ""|-*)
    echo "usage: app_token.sh --configured | --login | <owner> <repo>" >&2; exit 2 ;;
  *)
    owner="$1"; repo="${2:?usage: app_token.sh <owner> <repo>}"
    load_config || die "not configured ($CONFIG)"
    # HTTP 404 here means the App is not installed on this repo (or the App ID is wrong).
    inst="$(gh_app GET "/repos/$owner/$repo/installation" | jq -r .id)"
    # Scope the token down to this repo and the two permissions a reviewer needs.
    body="$(jq -nc --arg r "$repo" '{repositories:[$r], permissions:{pull_requests:"write", contents:"read"}}')"
    gh_app POST "/app/installations/$inst/access_tokens" "$body" | jq -er .token ;;
esac
