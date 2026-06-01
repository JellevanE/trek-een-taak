# Task Tracker

This repository contains a small Task Tracker application with two parts:

- `client/` — React frontend (Create React App)
- `server/` — Node.js + Express backend (TypeScript, JSON file storage)

## Quick start

1. Start the backend:

```bash
cd server
npm install
npm start
```

The API will be available at http://localhost:4001

2. Start the frontend (in another terminal):

```bash
cd client
npm install
npm start
```

Open http://localhost:4000 to view the app.

## Start both services with convenience script

You can start both backend and frontend with a single script. The script will also install missing dependencies automatically.

```bash
./start-dev.sh
```

Behavior:

- If `server/node_modules` or `client/node_modules` are missing or empty, the script runs `npm install` in the respective folder and logs output to `server-npm-install.log` or `client-npm-install.log`.
- Server logs are written to `server.log`, client logs to `client.log`.
- The script exports `JWT_SECRET=dev-local-secret` when it is not already set so the API can boot locally. Override this environment variable before running the script if you need a different secret.
- Press Ctrl-C to stop both services.

## Repository docs

- This file (root `README.md`) is the canonical overview and quick start for the whole repo.
- See `client/README.md` for client-specific developer notes and tooling.
- See `server/README.md` for backend-specific run/test instructions and notes about `tasks.json`.

## Notes and maintenance

- The backend persists data as JSON files (`tasks.json`, `users.json`, `campaigns.json`, `storylines.json`) using atomic writes (write-to-temp, then rename). These data files are gitignored. The stores have no cross-request locking, so for multi-user / concurrent use you should migrate to SQLite.
- Tests are present for backend routes (jest + supertest). Run them from the `server` folder with `npm test`.
- RPG progression (levels, XP rewards, daily bonuses) is handled on the server; responses include XP payloads so the client can stay in sync without extra requests.
- Debug helpers (`/api/debug/*`) let you clear/seed quests or tweak XP while prototyping.
- Configure JWT secrets with environment variables before starting the API: set `JWT_SECRET` for a single value, `JWT_SECRETS` for a comma-delimited rotation list, or `JWT_SECRET_FILE` to load the primary secret from disk. The server refuses to boot without a configured secret outside of test runs.

## Deployment

The app deploys as two pieces:

- the **client** as a static site (built with `npm run build`), and
- the **server** as a long-running web service with a **persistent disk** for the JSON stores.

Because the client talks to the API via relative `/api/...` paths, the static host must proxy `/api/*` to the server (and serve `index.html` for unknown routes so client-side routing works).

The server expects these environment variables in production (set them in your host, never commit values):

- `JWT_SECRET` — signing secret (the server refuses to boot without one)
- `ANTHROPIC_API_KEY` — required for the AI storyline feature
- `ALLOWED_ORIGINS` — comma-separated allowlist of frontend origins (CORS)
- `NODE_ENV=production`
- `TRUST_PROXY` — set when running behind a reverse proxy so client IPs (used for rate limiting) are correct
- `TASKS_FILE`, `USERS_FILE`, `CAMPAIGNS_FILE`, `STORYLINES_FILE` — point these at the persistent disk so data survives redeploys

# To do

- [x] Set up Deno automations and validations
- [x] Split up accumulated front end state management in `App.js` into multiple custom hooks
- [x] Show panel for keyboard shortcuts
- [x] Security hardening pass (JWT secret enforcement, CORS allowlist, login/registration rate limits, `helmet`, per-user AI generation quota)
- [x] Deploy app (static client + Express API with a persistent disk for the JSON stores)
- [ ] Migrate to SQLite (keep JSON for local dev) — adds cross-request locking / transactions
- [ ] Improve gamifacation and rpg elements (related to campaigns and classes)
- [ ] Visual overhaul
- [ ] API layer abstractions
- [ ] Improved error boundaries (server side)
