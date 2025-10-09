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

If you'd like, I can further split the root README into a short landing page and detailed docs per-package.
