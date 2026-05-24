#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

remove_path() {
  local target="$1"
  if [ -e "$target" ]; then
    rm -rf "$target" || {
      sleep 0.2
      rm -rf "$target" || true
    }
    printf 'removed %s\n' "$target"
  fi
}

remove_path ".turbo"
remove_path "dist"
remove_path "apps/web/.turbo"
remove_path "apps/web/dist"
remove_path "apps/web/output"
remove_path "apps/android/.gradle"
remove_path "apps/android/.kotlin"
remove_path "apps/android/.turbo"
remove_path "apps/android/build"
remove_path "apps/ios/.turbo"

for dir in apps/android/*/build; do
  [ -e "$dir" ] && remove_path "$dir"
done

for dir in packages/*/.turbo; do
  [ -e "$dir" ] && remove_path "$dir"
done

for dir in apps/ios/Packages/*/.build; do
  [ -e "$dir" ] && remove_path "$dir"
done

for dir in apps/ios/Packages/*/.swiftpm; do
  [ -e "$dir" ] && remove_path "$dir"
done
