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

bash scripts/supabase.sh functions serve &
pids+=("$!")

pnpm run dev &
pids+=("$!")

while true; do
  for pid in "${pids[@]}"; do
    if ! kill -0 "$pid" 2>/dev/null; then
      wait "$pid"
    fi
  done
  sleep 1
done
