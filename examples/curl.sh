#!/usr/bin/env bash
# Himalayas Remote Jobs API — curl examples
# Docs: https://himalayas.app/docs/remote-jobs-api
#
# Usage: bash examples/curl.sh
# Requires: curl, jq

set -euo pipefail

BASE="https://himalayas.app"

echo "==> Browse the newest 5 remote jobs"
curl -sS "$BASE/jobs/api?limit=5&offset=0" \
  | jq -r '"\(.totalCount) jobs total", (.jobs[] | "  \(.title) — \(.companyName)")'

echo
echo "==> Page 2 of the feed (jobs 21-40)"
curl -sS "$BASE/jobs/api?limit=20&offset=20" \
  | jq -r '.jobs[] | "  \(.title) — \(.companyName)"'

echo
echo "==> Search: React engineers, newest first"
curl -sS --get "$BASE/jobs/api/search" \
  --data-urlencode "q=react engineer" \
  --data-urlencode "sort=recent" \
  | jq -r '"\(.totalCount) matches", (.jobs[] | "  \(.title) — \(.companyName)")'

echo
echo "==> Search: senior full-time roles open to US-based candidates"
curl -sS --get "$BASE/jobs/api/search" \
  --data-urlencode "country=US" \
  --data-urlencode "seniority=Senior" \
  --data-urlencode "employment_type=Full Time" \
  --data-urlencode "sort=recent" \
  | jq -r '.jobs[] | "  \(.title) — \(.companyName)"'

echo
echo "==> Search: highest-paying jobs at a specific company"
curl -sS --get "$BASE/jobs/api/search" \
  --data-urlencode "company=linear" \
  --data-urlencode "sort=salaryDesc" \
  | jq -r '.jobs[] | "  \(.title) — \(.minSalary // "?")-\(.maxSalary // "?") \(.currency // "") per \(.salaryPeriod)"'

echo
echo "==> Worldwide-friendly jobs only"
curl -sS "$BASE/jobs/api/search?worldwide=true&sort=recent" \
  | jq -r '.jobs[] | "  \(.title) — \(.companyName)"'
