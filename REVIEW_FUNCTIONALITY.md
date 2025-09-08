# Functional Review — Task Tracker

Date: 2025-09-08

Repository: task_track

Purpose
-------
This document summarizes the main functional findings from a review of the application (server + client). It lists critical bugs, functional oversights, suggested fixes, and a prioritized checklist you can use to plan and track work.

Top-level summary
-----------------
- Backend: simple Express app that reads/writes `server/tasks.json`. Basic CRUD supported. I fixed a bug in nextId computation so the server no longer risks reusing top-level ids; persistence works but error handling could be improved.
- Frontend: Create React App that fetches `/api/tasks` and renders tasks. The add-subtask flow was brittle because the client used a single shared subtask input and non-functional state updates; I implemented per-task subtask inputs and functional updates.
- Dev experience: Client already contains a `proxy` entry and the server runs from `server/server.js` (server/package.json could still be tuned). Tests and scripts still need attention.

Critical findings (must-fix)
---------------------------
1. Server top-level id management: `nextId` could be incorrect in some persisted states and potentially reuse ids. (Partially fixed: `readTasks` now computes a safe `nextId` based on existing task ids.)
2. Server write errors are not properly surfaced to clients — `writeTasks` currently logs errors but endpoints may still return success codes. (Still to improve.)
3. Subtask ids: many persisted subtasks lacked numeric ids; server normalizes these on read and assigns stable numeric ids when creating subtasks. Client-side code previously assumed a single global subtask input which made adds brittle. (Client-side fix applied: per-task input + functional updates.)
4. Edit form and controlled inputs: edit flows should use cloned objects and controlled inputs to avoid mutation; this is recommended but not fully changed yet.

Functional correctness & bugs
----------------------------
- POST /api/tasks sets `due_date` to today unconditionally; client cannot pass a due date.
- `PUT /api/tasks/:id/subtasks/:subtask_id` uses array index as identifier; operations using index will break after reorder/removals.
- No server-side validation for required fields (`description`, `priority`).
- `app.get('/api/tasks')` returns the internal wrapper object `{tasks: [...], nextId: N}` — client currently expects `data.tasks` (works) but API shape is awkward.

Frontend issues and UX
---------------------
- Edit form uses `defaultValue` (uncontrolled) and sets `editingTask` to the live task object — leads to mutation and unpredictable updates. Use controlled inputs and clone when starting edit.
- Single `subTaskDescription` state shared globally — may be fine now but will be limiting if multiple forms are shown.
- Inconsistent subtask updates: frontend sometimes PUTs entire task, sometimes relies on subtask-specific endpoint.
- No loading, error, or confirmation UI (e.g., for delete). No disabled state during network calls.

Code quality, packaging, and dev tooling
---------------------------------------
- `server/package.json` should set `main` to `server.js` and add a `start` script.
- Add `proxy` to `client/package.json` (or use full backend URL). Add basic linting and CI pipeline later.
- Add backend route tests (supertest) and small unit tests for critical behaviour.

Why are there two README files?
--------------------------------
This repository contains two README files:

- `README.md` at the repository root: a high-level, repository-wide README that explains how to run both the `server` and `client`, troubleshooting tips, and notes about recent changes.
- `client/README.md`: the Create React App scaffold's README which documents client-specific scripts (`npm start`, `npm test`, `npm run build`) and guidance for frontend development.

Why it exists: CRA automatically generates `client/README.md` when the client app was created. Having both files is normal for mono-repos or multi-package repos where each package/app ships its own README.

Recommendation: Keep both but make their scope explicit:

- Keep `README.md` at the repo root as the canonical "how to run the whole project" entry point. Make it concise and link to component READMEs.
- Keep `client/README.md` for client-specific developer notes and `server/README.md` (create one) for backend-specific instructions. Alternatively, move client-specific instructions out of the root README and add a short pointer to `client/README.md`.

This reduces duplication and makes each README's intent clear to new contributors.

Security & operations
---------------------
- `cors()` is wide open; restrict in production.
- No auth — acceptable for single-user local app but note for production use.
- Consider making `tasks.json` path configurable via env var.

Quick, concrete fixes (low-risk) — implemented where noted
------------------------------------------------------
1. Ensure client can reach server via CRA proxy — `client/package.json` already contains `proxy: http://localhost:3001` (no change needed).
2. Server `main`/start: `server/package.json` could be updated to set `main` to `server.js` and ensure a `start` script; I did not change package.json in this pass.
3. Test update: `client/src/App.test.js` still needs a small change to match the app header; left as next-step.
4. Edit form: recommended to make fully controlled and clone editing objects; small improvements can be made in a follow-up.
5. Server `writeTasks` error surfacing: still recommended to return 500 on write failure; I left that improvement for the next iteration.

Implemented fixes in this iteration:
- `server/server.js`: safer top-level `nextId` computation in `readTasks` to avoid accidental id reuse.
- `client/src/App.js`: replaced a single `subTaskDescription` with `subTaskDescriptionMap` (per-task inputs) and used functional `setTasks(prev => ...)` updates when integrating server responses. This fixes the add-subtask UI and prevents stale state/interference between forms.

Prioritized roadmap (recommended)
--------------------------------
- Urgent (do first): add client proxy, add server start script, fix failing test, expose write errors, basic input validation.
- Important (next): make edits controlled + clone edit objects, add unique IDs for subtasks and update API + client usage, allow client to set `due_date`.
- Medium: atomic writes or small DB (lowdb/sqlite), add backend tests, add loading/error UI, confirmation modals.
- Nice-to-have: filters/sorting, CI, eslint/prettier, Dockerfile for server and client.

Checklist (track status here)
----------------------------
- [x] Add proxy to `client/package.json` — Already present
- [ ] Add `start` script and correct `main` in `server/package.json` — Pending
- [ ] Fix `client/src/App.test.js` — Pending
- [ ] Return 500 on failed disk writes and surface write errors — Pending (recommended)
- [ ] Accept `due_date` on task creation — Pending
- [x] Give subtasks unique IDs and update endpoints + client — Partially done: server normalizes existing subtasks and assigns numeric ids for new subtasks; client updated to use per-task inputs and functional updates.
- [ ] Make edit form controlled and clone task before editing — Pending (recommended)
- [ ] Add input validation on server for required fields — Pending
- [ ] Add loading/error UIs and disable buttons during requests — Pending
- [ ] Add confirmation on delete — Pending
- [ ] Add backend tests (supertest + jest) — Pending
- [ ] Make `tasks.json` path configurable via env — Pending

Next actions I can take (pick one or more)
----------------------------------------
1. Implement server error propagation: make `writeTasks` surface disk write failures and return 500 from endpoints when writes fail (small, high-value change).
2. Make the edit form fully controlled and clone the task into `editingTask` to avoid accidental mutations (small, UX improvement).
3. Add a tiny backend test suite (supertest) around subtask creation and update to prevent regressions (medium effort).
4. Update `server/package.json` to have `main: server.js` and a `start` script; update client test to match header text (trivial changes).

If you'd like, I can implement option 1 and 2 now and add tests next. I verified the add-subtask flow manually by starting the server and POSTing subtasks; the server returns the updated task and `server/tasks.json` reflects the new subtask ids.

Developer convenience
--------------------
I added a `start-dev.sh` script at the repository root to start both server and client and tail their logs. The script will automatically run `npm install` in `server`/`client` if `node_modules` is missing or empty. Logs and installation output are written to `server.log`, `client.log`, `server-npm-install.log`, and `client-npm-install.log` as appropriate.

----
Generated by review on 2025-09-08.
