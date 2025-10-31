#!/usr/bin/env bash
set -euo pipefail

# start-dev.sh — start server and client concurrently and tail their logs
# Usage: ./start-dev.sh

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

log() { printf "[%s] %s\n" "$(date +"%H:%M:%S")" "$*"; }

cd "$ROOT_DIR"

log "Starting server..."
cd "$ROOT_DIR/server"
# ensure server dependencies are installed
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  log "server/node_modules missing or empty — running npm install"
  npm install --no-audit --no-fund > "$ROOT_DIR/server-npm-install.log" 2>&1 || {
    log "npm install for server failed (see $ROOT_DIR/server-npm-install.log)"
    exit 1
  }
  log "server dependencies installed"
fi

# ensure JWT secret for local dev; allow override via existing env
if [ -z "${JWT_SECRET:-}" ]; then
  export JWT_SECRET="dev-local-secret"
  log "JWT_SECRET not set — using development fallback (override in env for custom secret)"
fi

# start server (ts-node) and redirect logs
npm run dev > "$ROOT_DIR/server.log" 2>&1 &
SERVER_PID=$!
log "Server PID $SERVER_PID (logs: $ROOT_DIR/server.log)"

# small delay to let server bind
sleep 1

log "Starting client..."
cd "$ROOT_DIR/client"
# ensure client dependencies are installed
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  log "client/node_modules missing or empty — running npm install"
  npm install --no-audit --no-fund > "$ROOT_DIR/client-npm-install.log" 2>&1 || {
    log "npm install for client failed (see $ROOT_DIR/client-npm-install.log)"
    cleanup
    exit 1
  }
  log "client dependencies installed"
fi

# start client (Create React App) and redirect logs
npm start > "$ROOT_DIR/client.log" 2>&1 &
CLIENT_PID=$!
log "Client PID $CLIENT_PID (logs: $ROOT_DIR/client.log)"

cleanup() {
  log "Stopping services..."
  if kill -0 "$CLIENT_PID" 2>/dev/null; then
    kill "$CLIENT_PID" 2>/dev/null || true
  fi
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
  log "Stopped."
}

trap cleanup SIGINT SIGTERM EXIT

log "Both services started. Press Ctrl-C to stop. Tailing logs..."

# tail both logs so the script stays running and shows output
tail -n +1 -f "$ROOT_DIR/server.log" "$ROOT_DIR/client.log" &
wait
