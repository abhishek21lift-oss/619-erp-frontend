#!/usr/bin/env bash
#
# Ask the running container which commit it is serving, and record the deploy
# only if the answer matches what we just built.
#
# ── Why this is a file and not lines in deploy.yml ────────────────────────
#
# The backend carried the identical block inside its DEPLOY_SCRIPT, and it
# never executed: the deploy log showed the container start and the script
# exit 1 forty-one milliseconds later, with none of the loop's output — not
# its error branch, not the 150 seconds of polling it should have taken. Run
# as an ordinary script the same block behaves correctly, so the block was
# right and the way those lines get assembled and shipped over SSH could not
# carry it. Every line that preceded it, across hundreds of deploys, had been
# exactly one command.
#
# This repository's copy had the same shape and had not yet had the chance to
# fail. It lives here now: one line to call, ordinary shell semantics, tested.
set -eu

EXPECTED_SHA="${1:?usage: verify-serving.sh <expected-sha> [compose-dir] [service] [health-url] [marker-file]}"
COMPOSE_DIR="${2:-/opt/myptstudio}"
SERVICE="${3:-frontend}"
HEALTH_URL="${4:-http://127.0.0.1:3000/api/health}"
MARKER="${5:-/opt/myptstudio/.frontend-deployed-sha}"

ATTEMPTS="${VERIFY_ATTEMPTS:-30}"
INTERVAL="${VERIFY_INTERVAL:-5}"

# Whitespace-tolerant on purpose: the first version required exactly
# `"sha":"..."`, so any future pretty-printing of the health payload would
# have turned this gate into one that always fails.
serving_sha() {
  local body
  body="$(curl -sf --max-time 5 "$HEALTH_URL" 2>/dev/null || true)"
  printf '%s' "$body" \
    | sed -n 's/.*"sha"[[:space:]]*:[[:space:]]*"\([0-9a-f]\{7,40\}\)".*/\1/p' \
    | head -1
}

echo "verifying: expecting $EXPECTED_SHA at $HEALTH_URL"

SERVING=""
attempt=0
while [ "$attempt" -lt "$ATTEMPTS" ]; do
  attempt=$((attempt + 1))
  SERVING="$(serving_sha)"
  if [ -n "$SERVING" ] && [ "$SERVING" = "$EXPECTED_SHA" ]; then
    break
  fi
  sleep "$INTERVAL"
done

if [ "$SERVING" != "$EXPECTED_SHA" ]; then
  echo "::error::deploy verification failed after ${attempt} attempts — expected ${EXPECTED_SHA}, ${SERVICE} reports '${SERVING:-no answer}'"
  ( cd "$COMPOSE_DIR" && docker compose logs --tail 60 "$SERVICE" ) || true
  # NOT advanced: the marker keeps naming the last commit known to have
  # actually served traffic, which is what rollback.yml targets.
  rm -f "${MARKER}.new"
  exit 1
fi

echo "deploy verified: ${SERVICE} is serving ${SERVING} (after ${attempt} attempt(s))"
mv "${MARKER}.new" "$MARKER"
( cd "$COMPOSE_DIR" && docker image prune -f ) || true
