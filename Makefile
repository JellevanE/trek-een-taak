# Makefile — local dev front door for task_track.
#
# This is a thin index over the real tooling (npm scripts, deno tasks,
# start-dev.sh). It does not replace them; it groups them so you don't have to
# remember which of four places a command lives in. `make` or `make help`
# lists everything.
#
# Gating recap (so the targets make sense):
#   - Client debug UI  -> compile-time. `npm start`/`make dev` => NODE_ENV
#     development => debug tooling visible. `npm run build`/`make build` =>
#     production => debug compiled out of the bundle. No env flag involved.
#   - Server admin      -> runtime. Access is granted per-request to the
#     usernames in ADMIN_USERNAMES (server/.env locally). No rebuild needed;
#     see `make admins`.

SERVER := server
CLIENT := client

.DEFAULT_GOAL := help

# ── Help ────────────────────────────────────────────────────────────────────
.PHONY: help
help: ## Show this help
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-16s\033[0m %s\n",$$1,$$2}'

# ── Setup ───────────────────────────────────────────────────────────────────
.PHONY: install install-server install-client
install: install-server install-client ## Install dependencies for both projects

install-server: ## Install server dependencies
	cd $(SERVER) && npm install

install-client: ## Install client dependencies
	cd $(CLIENT) && npm install

# ── Dev (debug tooling ON) ───────────────────────────────────────────────────
.PHONY: dev dev-server dev-client
dev: ## Run server + client with hot reload and debug tooling
	./start-dev.sh

dev-server: ## Run only the server (tsx watch) on :4001
	cd $(SERVER) && npm run dev

dev-client: ## Run only the client (CRA) on :4000
	cd $(CLIENT) && npm start

# ── Production build (debug tooling stripped) ─────────────────────────────────
.PHONY: build build-server build-client
build: build-client build-server ## Production build of client + server

build-client: ## Build the client bundle -> client/build (debug UI compiled out)
	# INLINE_RUNTIME_CHUNK=false keeps all JS external so it loads under the
	# server's default CSP (script-src 'self'); no inline <script> to block.
	cd $(CLIENT) && CI=false INLINE_RUNTIME_CHUNK=false npm run build

build-server: ## Compile the server -> server/dist (+ copies prompts)
	cd $(SERVER) && npm run build

.PHONY: start prod-preview
start: ## Run the compiled server in prod mode (run `make build` first)
	cd $(SERVER) && NODE_ENV=production npm start

prod-preview: build start ## Build the prod bundle then serve it (verify debug is stripped)

# ── Quality ──────────────────────────────────────────────────────────────────
.PHONY: test test-server test-client lint fmt fmt-check validate
test: test-server test-client ## Run all tests

test-server: ## Run server tests (Jest + Supertest)
	cd $(SERVER) && npm test

test-client: ## Run client tests once (CI mode)
	cd $(CLIENT) && CI=true npm test

lint: ## Lint the server (no explicit `any`)
	cd $(SERVER) && npm run lint

fmt: ## Format JS/TS with deno fmt
	deno fmt

fmt-check: ## Check formatting without writing changes
	deno fmt --check

validate: ## Run the full validation suite (server + client)
	deno task validate

# ── Admin / docs ─────────────────────────────────────────────────────────────
.PHONY: admins stats docs
admins: ## Show which usernames have admin access locally (server/.env)
	@grep -E '^ADMIN_USERNAMES=' $(SERVER)/.env 2>/dev/null \
		|| echo "ADMIN_USERNAMES not set in $(SERVER)/.env"

stats: ## Fetch admin user stats from the deployed API (prompts for password; pass ARGS="--user x --json")
	deno task admin:stats $(ARGS)

docs: ## Regenerate the server OpenAPI spec
	cd $(SERVER) && npm run docs:generate

# ── Backups ──────────────────────────────────────────────────────────────────
.PHONY: backup backup-list backup-keep
backup: ## Snapshot JSON stores to ./backups/<timestamp>/
	deno task backup

backup-list: ## List available backup snapshots
	deno task backup:list

backup-keep: ## Prune backups, keeping the last 10
	deno task backup:keep

# ── Housekeeping ─────────────────────────────────────────────────────────────
.PHONY: clean
clean: ## Remove build artifacts and dev logs
	rm -rf $(CLIENT)/build $(SERVER)/dist
	rm -f server.log client.log server-npm-install.log client-npm-install.log
