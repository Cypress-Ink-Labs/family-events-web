#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

pids=()

cleanup() {
  local status=$?
  trap - EXIT INT TERM

  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done

  wait 2>/dev/null || true
  exit "$status"
}

trap cleanup EXIT INT TERM

bash scripts/supabase.sh start
pnpm run setup:local

bash scripts/supabase-functions-serve.sh &
pids+=("$!")

pnpm run dev &
pids+=("$!")

# Block until ANY child exits. `wait -n` returns as soon as the first child
# completes (or fails), at which point cleanup() tears down the rest. Replaces
# the prior `while true; sleep 1` polling loop, which (a) wasted a second on
# every iteration before noticing a death, and (b) could deadlock by calling
# `wait` on an already-reaped pid.
if wait -n; then
  exit 0
else
  exit_code=$?
  echo "[dev-all] child exited with status $exit_code; shutting down siblings" >&2
  exit "$exit_code"
fi
