#!/usr/bin/env bash
# Himalayas Remote Jobs API: curl examples
# Docs: https://himalayas.app/docs/remote-jobs-api
#
# No API key needed; set HIMALAYAS_API_KEY to use a free key for higher limits (https://himalayas.app/signup/developer).
#
# Usage: bash examples/curl.sh
# Requires: curl, jq

set -euo pipefail

BASE="https://himalayas.app"

AUTH=()
if [ -n "${HIMALAYAS_API_KEY:-}" ]; then
  AUTH=(-H "Authorization: Bearer $HIMALAYAS_API_KEY")
fi

HEADERS=$(mktemp)
trap 'rm -f "$HEADERS"' EXIT

# GET a URL (extra args are curl options, e.g. --data-urlencode).
# On 429, wait Retry-After seconds (60 if absent) and retry, up to 3 tries.
api() {
  local attempt response status wait
  for attempt in 1 2 3; do
    response=$(curl -sS -D "$HEADERS" -w '\n%{http_code}' ${AUTH[@]+"${AUTH[@]}"} --get "$@")
    status=${response##*$'\n'}
    if [ "$status" != "429" ]; then
      if [ "$status" != "200" ]; then
        echo "HTTP $status for $1" >&2
        return 1
      fi
      printf '%s\n' "${response%$'\n'*}"
      return 0
    fi
    [ "$attempt" = 3 ] && break
    wait=$(awk 'tolower($1) == "retry-after:" { print $2 + 0 }' "$HEADERS")
    echo "Rate limited; retrying in ${wait:-60}s" >&2
    sleep "${wait:-60}"
  done
  echo "Still rate limited after 3 tries: $1" >&2
  return 1
}

echo "==> Browse the newest 5 remote jobs"
first=$(api "$BASE/jobs/api" --data-urlencode "limit=5")
echo "$first" | jq -r '"About \(.totalCount) jobs (an estimate)", (.jobs[] | "  \(.title) at \(.companyName)")'

# Page with the cursor: pass nextCursor back as cursor; stop when there is none.
cursor=$(echo "$first" | jq -r '.nextCursor // empty')
if [ -n "$cursor" ]; then
  echo
  echo "==> Next page of the feed, using nextCursor"
  api "$BASE/jobs/api" --data-urlencode "limit=20" --data-urlencode "cursor=$cursor" \
    | jq -r '.jobs[] | "  \(.title) at \(.companyName)"'
fi

echo
echo "==> Search: React engineers, newest first"
api "$BASE/jobs/api/search" \
  --data-urlencode "q=react engineer" \
  --data-urlencode "sort=recent" \
  | jq -r '"About \(.totalCount) matches", (.jobs[] | "  \(.title) at \(.companyName)")'

echo
echo "==> Search: senior full-time roles open to US-based candidates (one country per request)"
api "$BASE/jobs/api/search" \
  --data-urlencode "country=US" \
  --data-urlencode "seniority=Senior" \
  --data-urlencode "employment_type=Full Time" \
  --data-urlencode "sort=recent" \
  | jq -r '.jobs[] | "  \(.title) at \(.companyName)"'

echo
echo "==> Search: highest-paying jobs at a specific company (company takes companySlug)"
# minSalary/maxSalary are in salaryPeriod units, not normalized to annual.
api "$BASE/jobs/api/search" \
  --data-urlencode "company=linear" \
  --data-urlencode "sort=salaryDesc" \
  | jq -r '.jobs[] | "  \(.title): \(.minSalary // "?")-\(.maxSalary // "?") \(.currency // "") per \(.salaryPeriod)"'

echo
echo "==> Worldwide-friendly jobs only"
api "$BASE/jobs/api/search" \
  --data-urlencode "worldwide=true" \
  --data-urlencode "sort=recent" \
  | jq -r '.jobs[] | "  \(.title) at \(.companyName)"'
