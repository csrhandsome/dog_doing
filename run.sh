#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$ROOT_DIR/server"
CLIENT_DIR="$ROOT_DIR/client"
SERVER_HOST="${SERVER_HOST:-0.0.0.0}"
SERVER_PORT="${SERVER_PORT:-3001}"
CLIENT_HOST="${CLIENT_HOST:-0.0.0.0}"
CLIENT_PORT="${CLIENT_PORT:-5173}"
PUBLIC_HOST="${PUBLIC_HOST:-}"

for cmd in pnpm bun; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
done

echo "Backend will listen on ${SERVER_HOST}:${SERVER_PORT}"
echo "Frontend will listen on ${CLIENT_HOST}:${CLIENT_PORT}"

if [[ -n "$PUBLIC_HOST" ]]; then
  echo "Open: http://${PUBLIC_HOST}:${CLIENT_PORT}"
  echo "Health: http://${PUBLIC_HOST}:${SERVER_PORT}/health"
else
  echo "Open locally: http://127.0.0.1:${CLIENT_PORT}"
  echo "Health locally: http://127.0.0.1:${SERVER_PORT}/health"
  echo "To print a public URL, run with: PUBLIC_HOST=<your-server-ip> ./run.sh"
fi

echo "Starting backend from $SERVER_DIR"
(cd "$SERVER_DIR" && SERVER_HOST="$SERVER_HOST" PORT="$SERVER_PORT" pnpm dev) &
server_pid=$!

echo "Starting frontend from $CLIENT_DIR"
(
  cd "$CLIENT_DIR" && \
    VITE_HOST="$CLIENT_HOST" \
    VITE_PORT="$CLIENT_PORT" \
    VITE_SERVER_HOST="127.0.0.1" \
    VITE_SERVER_PORT="$SERVER_PORT" \
    pnpm dev -- --host "$CLIENT_HOST" --port "$CLIENT_PORT"
) &
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
