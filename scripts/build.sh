#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLIENT_DIR="$ROOT_DIR/client"
SERVER_DIR="$ROOT_DIR/server"

for cmd in pnpm bun; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
done

echo "Building frontend in $CLIENT_DIR"
(cd "$CLIENT_DIR" && pnpm build)

echo "Building backend in $SERVER_DIR"
(cd "$SERVER_DIR" && pnpm build)

echo "Build complete"
echo "Frontend bundle: $CLIENT_DIR/dist"
echo "Backend entry: $SERVER_DIR/dist/index.js"
