# Task Tracker

This repository contains a small Task Tracker application with two parts:

- `client/` — React frontend (Create React App)
- `server/` — Node.js + Express backend (file-backed via `tasks.json`)

Quick start
-----------
1. Start the backend:

```bash
cd server
npm install
npm start
```

The API will be available at http://localhost:3001

2. Start the frontend (in another terminal):

```bash
cd client
npm install
npm start
```

Open http://localhost:3000 to view the app.

Start both services with convenience script
-----------------------------------------
You can start both backend and frontend with a single script. The script will also install missing dependencies automatically.

```bash
./start-dev.sh
```

Behavior:
- If `server/node_modules` or `client/node_modules` are missing or empty, the script runs `npm install` in the respective folder and logs output to `server-npm-install.log` or `client-npm-install.log`.
- Server logs are written to `server.log`, client logs to `client.log`.
- The script exports `JWT_SECRET=dev-local-secret` when it is not already set so the API can boot locally. Override this environment variable before running the script if you need a different secret.
- Press Ctrl-C to stop both services.

Repository docs
---------------
- This file (root `README.md`) is the canonical overview and quick start for the whole repo.
- See `client/README.md` for client-specific developer notes and tooling.
- See `server/README.md` for backend-specific run/test instructions and notes about `tasks.json`.

Notes and maintenance
---------------------
- The backend stores data in `server/tasks.json` (file-backed). For anything beyond single-user local development you should migrate to a tiny DB (sqlite/lowdb) or implement atomic writes.
- Tests are present for backend routes (jest + supertest). Run them from the `server` folder with `npm test`.
- RPG progression (levels, XP rewards, daily bonuses) is handled on the server; responses include XP payloads so the client can stay in sync without extra requests.
- Debug helpers (`/api/debug/*`) let you clear/seed quests or tweak XP while prototyping.
- Configure JWT secrets with environment variables before starting the API: set `JWT_SECRET` for a single value, `JWT_SECRETS` for a comma-delimited rotation list, or `JWT_SECRET_FILE` to load the primary secret from disk. The server refuses to boot without a configured secret outside of test runs.

Deno task runner
----------------
Install [Deno](https://deno.land/) (v1.40 or newer) to take advantage of repository-wide automation.

### Testing and validation
- `deno task validate` — runs backend Jest specs followed by the React test suite (single pass).
- `deno task validate:ci` — runs the validate pipeline and finishes with `client` production build.
- `deno task test:server` — executes only the server tests.
- `deno task test:client` — executes only the client tests (non-watch mode).
- `deno task build:client` — builds the frontend bundle for release verification.

### Data backup and restore
- `deno task backup` — creates a timestamped backup of all JSON data files (`tasks.json`, `users.json`, `campaigns.json`).
- `deno task backup:list` — lists all available backups with timestamps and sizes.
- `deno task backup:keep` — creates a backup and automatically removes old backups, keeping only the 10 most recent.

For restore operations or advanced options:
```bash
# Restore a specific backup
deno run --allow-env --allow-read --allow-write tools/backup.ts --restore 2024-01-15_14-30-00

# Create backup and keep only 5 most recent
deno run --allow-env --allow-read --allow-write tools/backup.ts --keep 5

# Show help
deno run --allow-env --allow-read --allow-write tools/backup.ts --help
```

Backups are stored in the `backups/` directory (git-ignored). When restoring, the current state is automatically backed up to a `*_pre-restore` directory for safety.

Task definitions live in `deno.jsonc`. The orchestrator script (`tools/validate.ts`) uses Deno's permissioned process runner to provide consistent local and CI validation workflows without adding further Node tooling.

To do
-----
- [x] Set up Deno automations and validations
- [x] Split up accumulated front end state management in `App.js` into multiple custom hooks
- [x] Add automated backup and restore functionality

Known issues
------------
- `client/src/App.js:67-89` — any network failure while fetching tasks clears the token and logs the player out. Differentiate 401 responses from transient errors so brief outages do not kick people back to the login screen.

If you'd like, I can further split the root README into a short landing page and detailed docs per-package.
