#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$ROOT_DIR/server"
CLIENT_DIR="$ROOT_DIR/client"

for cmd in pnpm bun; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
done

echo "Starting backend from $SERVER_DIR"
(cd "$SERVER_DIR" && pnpm dev) &
server_pid=$!

echo "Starting frontend from $CLIENT_DIR"
(cd "$CLIENT_DIR" && pnpm dev) &
client_pid=$!

cleanup() {
  local exit_code=$?

  trap - EXIT INT TERM

  for pid in "$server_pid" "$client_pid"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done

  wait "$server_pid" 2>/dev/null || true
  wait "$client_pid" 2>/dev/null || true

  exit "$exit_code"
}

trap cleanup EXIT INT TERM

# Stop the remaining dev server if either side exits first.
wait -n "$server_pid" "$client_pid"
