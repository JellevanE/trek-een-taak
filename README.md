# Task Tracker

This repository contains a small Task Tracker application with two parts:

- `client/` — React frontend (Create React App)
- `server/` — Node.js + Express backend (TypeScript, JSON file storage)
- `tools/` — Deno scripts for validation and backups

## Quick start

The `Makefile` is the front door for local development — it groups the
underlying npm/deno/`start-dev.sh` commands so you don't have to remember which
lives where. Run `make help` to list every target.

```bash
make dev        # installs missing deps, starts server (:4001) + client (:4000)
```

Open http://localhost:4000 to view the app. The API is at http://localhost:4001.

`make dev` wraps `start-dev.sh`, which:

- runs `npm install` in `server/` or `client/` if `node_modules` is missing
  (output logged to `server-npm-install.log` / `client-npm-install.log`),
- writes server logs to `server.log` and client logs to `client.log`,
- exports `JWT_SECRET=dev-local-secret` when it is not already set so the API can
  boot locally (override it in your env for a custom secret),
- stops both services on Ctrl-C.

> Most targets only need Node + npm. `make fmt`, `make validate`, and the
> `make backup*` targets require [Deno](https://deno.com/).

## Commands

Run `make help` for the full list. The main targets:

| Target                                                  | What it does                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| `make dev`                                              | Server + client with hot reload and debug tooling                   |
| `make dev-server` / `make dev-client`                   | Run just one side                                                   |
| `make install`                                          | Install deps for both projects                                      |
| `make build`                                            | Production build of client + server (debug UI compiled out)         |
| `make start`                                            | Run the compiled server in prod mode (after `make build`)           |
| `make prod-preview`                                     | Build then serve the prod bundle locally (verify debug is stripped) |
| `make test`                                             | Run all tests (server + client)                                     |
| `make test-server` / `make test-client`                 | Run one test suite                                                  |
| `make lint`                                             | Lint the server (no explicit `any`)                                 |
| `make fmt` / `make fmt-check`                           | Format / check formatting with `deno fmt`                           |
| `make validate`                                         | Full validation suite (server + client)                             |
| `make admins`                                           | Show which usernames have admin access locally (`server/.env`)      |
| `make docs`                                             | Regenerate the server OpenAPI spec                                  |
| `make backup` / `make backup-list` / `make backup-keep` | Snapshot / list / prune JSON stores                                 |
| `make clean`                                            | Remove build artifacts and dev logs                                 |

Each target just delegates to the existing tooling, so you can still run the raw
commands directly if you prefer (e.g. `cd server && npm run dev`).

## Repository docs

- This file (root `README.md`) is the canonical overview and quick start for the
  whole repo.
- See `client/README.md` for client-specific developer notes and tooling.
- See `server/README.md` for backend-specific run/test instructions and notes
  about `tasks.json`.

## Notes and maintenance

- The backend persists data as JSON files (`tasks.json`, `users.json`,
  `campaigns.json`, `storylines.json`) using atomic writes (write-to-temp, then
  rename). These data files are gitignored. The stores have no cross-request
  locking, so for multi-user / concurrent use you should migrate to SQLite.
- Tests are present for backend routes (jest + supertest) and the client. Run
  them with `make test` (or `cd server && npm test`).
- RPG progression (levels, XP rewards, daily bonuses) is handled on the server;
  responses include XP payloads so the client can stay in sync without extra
  requests.
- Debug helpers (`/api/debug/*`) let you clear/seed quests or tweak XP while
  prototyping. The debug UI only renders in development builds, and the
  endpoints require an operator account (see
  [Operator access](#operator-access-user-stats)), so they are inert for normal
  users in production.
- Configure JWT secrets with environment variables before starting the API: set
  `JWT_SECRET` for a single value, `JWT_SECRETS` for a comma-delimited rotation
  list, or `JWT_SECRET_FILE` to load the primary secret from disk. The server
  refuses to boot without a configured secret outside of test runs.

## Deployment

The app deploys as a **single web service** (currently on Render) backed by a
**persistent disk** for the JSON stores. In production the Express server both
exposes the API under `/api/*` **and** serves the compiled React bundle from
`client/build`, with an SPA fallback that returns `index.html` for non-API GET
routes so client-side routing survives deep links and refreshes. No separate
static host or `/api/*` proxy is required.

Build and start commands for the host:

```bash
# Build
npm --prefix server ci
npm --prefix client ci
CI=false INLINE_RUNTIME_CHUNK=false npm --prefix client run build
npm --prefix server run build

# Start
npm --prefix server start
```

`CI=false` stops Create React App from treating lint warnings as build errors;
`INLINE_RUNTIME_CHUNK=false` keeps all JS external so it loads under the server's
default `helmet` CSP (`script-src 'self'`).

> `render.yaml` in the repo root is **reference only** — the live service is
> configured in the Render dashboard. Render only applies `render.yaml` to
> services created as a Blueprint, so the committed file documents the intended
> config but does not drive the running service. Change build/start commands and
> env vars in the dashboard.

The server expects these environment variables in production (set them in your
host, never commit values):

- `JWT_SECRET` — signing secret (the server refuses to boot without one)
- `ANTHROPIC_API_KEY` — required for the AI storyline feature
- `ALLOWED_ORIGINS` — comma-separated allowlist of frontend origins (CORS)
- `NODE_ENV=production` — also gates serving the client bundle
- `TRUST_PROXY` — set when running behind a reverse proxy so client IPs (used
  for rate limiting) are correct
- `TASKS_FILE`, `USERS_FILE`, `CAMPAIGNS_FILE`, `STORYLINES_FILE` — point these
  at the persistent disk so data survives redeploys
- `ADMIN_USERNAMES` — optional, comma-separated and case-insensitive. Grants
  operator access to `/api/admin/*` and the `/api/debug/*` helpers. Leave unset
  to disable all admin access.

Do **not** set `PORT` on Render — it is injected automatically and the server
reads it.

### Operator access (user stats)

There is a small, read-only endpoint for whoever runs the deployment to check
basic account info: `GET /api/admin/stats` returns the total account count plus,
per user, the username, signup and last-active timestamps, level/XP, and task
count. Passwords and emails are never included.

Access is gated entirely by the server-side `ADMIN_USERNAMES` environment
variable. Only someone who controls the deployment environment (e.g. the host's
dashboard) can set it — reading this README grants nothing on its own. To use
it:

1. On the server, set `ADMIN_USERNAMES` to the username of an existing account
   you control, then restart/redeploy.
2. Sign in as that account to obtain its token.
3. Call the endpoint with the token, e.g.
   `curl -H "Authorization: Bearer <token>" https://<your-host>/api/admin/stats`.

The same gate protects the `/api/debug/*` helpers. When `ADMIN_USERNAMES` is
unset, every admin and debug request returns `403`.

## To do

- [x] Set up Deno automations and validations
- [x] Split up accumulated front end state management in `App.js` into multiple
      custom hooks
- [x] Show panel for keyboard shortcuts
- [x] Security hardening pass (JWT secret enforcement, CORS allowlist,
      login/registration rate limits, `helmet`, per-user AI generation quota)
- [x] Deploy app (single Express service serving the API + client bundle, with a
      persistent disk for the JSON stores)
- [ ] Migrate to SQLite (keep JSON for local dev) — adds cross-request locking /
      transactions
- [ ] Improve gamifacation and rpg elements (related to campaigns and classes)
- [ ] Visual overhaul
- [ ] API layer abstractions
- [ ] Improved error boundaries (server side)
