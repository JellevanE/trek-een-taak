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

## Review & Refactor Plan — Task Tracker

Date: 2025-09-08

This document replaces the previous review and gives a compact, prioritized roadmap for refactors and immediate fixes. It focuses on safety, correctness, and small high-value changes that reduce technical debt.

Requirements (from your request)
- Review the repository and identify important refactors.
- Propose prioritized changes and rationale.
- Overwrite `REVIEW_FUNCTIONALITY.md` with the result. 

Quick summary
- The server is a small Express app that persists to `server/tasks.json`. It works for local single-user use but has fragile persistence error handling, inconsistent validation, and mixed responsibilities in `server.js`.
- The client is a CRA app that mostly works but has some uncontrolled inputs, mixed update strategies, and lacking UX states (loading/errors).

Top priorities (what to do first)
1) Make disk writes safe and surfaced (high, small):
	- Refactor `server/writeTasks` to use atomic writes (write to temp + rename), or switch to `fs.promises` with a retry/lock strategy.
	- Ensure write failures throw and endpoints return 500 so clients can react.
	- Make `tasks.json` path configurable via ENV (e.g. `TASKS_FILE` env var) for tests and deployments.

2) Server input validation and clear API shapes (high, small):
	- Add server-side validation for endpoints (description required, priority in allowed set). Use lightweight validation (custom checks or `express-validator`).
	- Return consistent JSON error responses { error: 'message' } and appropriate HTTP codes.

3) Separate responsibilities in the server (medium):
	- Move persistence, normalization, and business logic into small modules: `lib/persist.js`, `lib/tasks.js` and keep `server.js` focused on routing.
	- Add small unit tests for the normalization logic.

4) Improve subtask and ID handling (medium):
	- Keep numeric stable ids for tasks and subtasks. If you want unique strings in future, use UUIDs.
	- Ensure `nextId` / `nextSubtaskId` are always computed from data on load (defensive).

5) Client behavior and UX (medium):
	- Make edit forms controlled and clone the task into local edit state before editing to avoid mutating global state.
	- Use per-task subtask input state (already partially done) and show loading/disabled states when requests are in-flight.
	- Ensure client accepts and sends `due_date` when creating/updating tasks.

Lower priority / longer-term improvements
- Replace file persistence with a tiny DB (lowdb or sqlite) for atomicity and concurrency.
- Add CI (GitHub Actions) to run `npm test` for `server` and `client`.
- Add ESLint + Prettier and a simple CONTRIBUTING.md.

Concrete, actionable changes (small PR-sized items)
1. server: make `TASKS_FILE` configurable via env; update `readTasks`/`writeTasks` to use `fs.promises` and atomic write (or `writeFileSync` to a tmp file + rename). Add tests that simulate write failures.
2. server: return JSON errors; ensure all endpoints validate input and return 400 for invalid requests.
3. server: split `server.js` into `routes/tasks.js` and `lib/persistence.js` (small refactor to improve testability).
4. client: change edit modal/form to use a cloned `editingTask` object in local component state; use controlled inputs and `onSave` to send patch.
5. repo: update `server/package.json` to include `main: server.js` and keep `start`/`test` scripts explicit. Add a minimal `server/README.md` describing the env var `TASKS_FILE`.

Checklist (status)
- [ ] Make writes atomic and surface write errors (recommended first change)
- [ ] Add server-side validation + consistent error format
- [ ] Refactor server into small modules (routes + persistence)
- [ ] Make edit forms controlled on client and add loading/error states
- [ ] Make `tasks.json` path configurable via env
- [ ] Add backend tests for normalization and write failure handling
- [ ] Consider swapping file persistence for lowdb/sqlite (later)

Notes on risk and effort
- Small, low-risk wins: atomic writes + error propagation, env-configurable path, consistent error JSON. Each is low LOC and high value.
- Medium effort: splitting server into modules and adding tests — moderate but improves maintainability.
- Bigger changes: DB migration — highest effort but pays off for multi-user or CI scenarios.

Suggested immediate next step (I can implement now)
- Implement atomic write + error propagation in `server/server.js` and add one test that simulates a write failure. This is a focused, high-impact change.

If you'd like I can open a PR that implements the immediate next step (atomic write + error handling) and follow up with the server split and client form changes.

Files you may want to edit in the short term
- `server/server.js` — split validation/persistence and improve writes
- `server/package.json` — confirm `main` and `start` scripts
- `server/__tests__/api.test.js` — add test for write failure and validation
- `client/src/*` — make forms controlled and add loading state

End of review.






FOR SOUNDS

https://www.bfxr.net/

FOR VISUALS

https://www.slynyrd.com/blog