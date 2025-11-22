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

# set server port
export PORT=4001

# start server (ts-node) and redirect logs
npm run dev > "$ROOT_DIR/server.log" 2>&1 &
SERVER_PID=$!
log "Server PID $SERVER_PID (logs: $ROOT_DIR/server.log)"

# small delay to let server bind
sleep 1

log "Starting client..."
cd "$ROOT_DIR/client"

# set client port
export PORT=4000

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
  
  # Kill the tail process if it exists
  if [ -n "${TAIL_PID:-}" ] && kill -0 "$TAIL_PID" 2>/dev/null; then
    kill "$TAIL_PID" 2>/dev/null || true
  fi
  
  # Kill client and all its child processes
  if [ -n "${CLIENT_PID:-}" ] && kill -0 "$CLIENT_PID" 2>/dev/null; then
    pkill -P "$CLIENT_PID" 2>/dev/null || true
    kill "$CLIENT_PID" 2>/dev/null || true
  fi
  
  # Kill server and all its child processes
  if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    pkill -P "$SERVER_PID" 2>/dev/null || true
    kill "$SERVER_PID" 2>/dev/null || true
  fi
  
  # Give processes a moment to terminate gracefully
  sleep 0.5
  
  # Force kill if still running
  if [ -n "${CLIENT_PID:-}" ] && kill -0 "$CLIENT_PID" 2>/dev/null; then
    kill -9 "$CLIENT_PID" 2>/dev/null || true
  fi
  if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill -9 "$SERVER_PID" 2>/dev/null || true
  fi
  
  log "Stopped."
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

log "Both services started. Press Ctrl-C to stop. Tailing logs..."

# tail both logs so the script stays running and shows output
tail -n +1 -f "$ROOT_DIR/server.log" "$ROOT_DIR/client.log" &
TAIL_PID=$!
wait "$TAIL_PID" 2>/dev/null || true
