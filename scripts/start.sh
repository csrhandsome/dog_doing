#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_DIR="$ROOT_DIR/server"
CLIENT_INDEX="$ROOT_DIR/client/dist/index.html"
SERVER_ENTRY="$SERVER_DIR/dist/index.js"
SERVER_HOST="${SERVER_HOST:-0.0.0.0}"
SERVER_PORT="${SERVER_PORT:-3001}"
PUBLIC_HOST="${PUBLIC_HOST:-}"

for cmd in pnpm bun; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
done

if [[ ! -f "$CLIENT_INDEX" ]]; then
  echo "Missing frontend bundle: $CLIENT_INDEX" >&2
  echo "Run: pnpm run build" >&2
  exit 1
fi

if [[ ! -f "$SERVER_ENTRY" ]]; then
  echo "Missing backend bundle: $SERVER_ENTRY" >&2
  echo "Run: pnpm run build" >&2
  exit 1
fi

if [[ -n "$PUBLIC_HOST" ]]; then
  echo "Production app: http://${PUBLIC_HOST}:${SERVER_PORT}"
else
  echo "Production app: http://127.0.0.1:${SERVER_PORT}"
  echo "To print a public URL, run with: PUBLIC_HOST=<your-server-ip> pnpm run start"
fi

cd "$SERVER_DIR"
SERVER_HOST="$SERVER_HOST" PORT="$SERVER_PORT" pnpm start
