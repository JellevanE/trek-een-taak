# Server — Task Tracker

This folder contains the backend API for the Task Tracker app.

Run locally
-----------

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

The server listens on `http://localhost:3001` by default.

Tests
-----

The project includes basic tests using `jest` and `supertest`.

Run tests:

```bash
npm test
```

Notes
-----

- Data is persisted to `server/tasks.json`. Tests will modify this file; they try to reset state but consider using a separate test fixture file for CI.
- `writeTasks` throws on write errors and endpoints return 500 when writes fail. This is intentional so clients can surface errors.
- For production or concurrent use, consider moving away from a single JSON file to a small database (sqlite, lowdb) and implement atomic writes.
- The API now maintains a lightweight RPG experience system. Completing quests or side-quests awards XP based on task level and priority, and players can claim a once-per-day bonus via `POST /api/rpg/daily-reward`.
- Each XP-granting response includes `xp_events` and a `player_rpg` snapshot so clients can react without making an extra profile request.
- Developer helpers:
  - `POST /api/debug/clear-tasks` removes all quests for the current user.
  - `POST /api/debug/seed-tasks` (optional body `{ count: number }`) fills the current user with demo quests.
  - `POST /api/debug/grant-xp` (body `{ amount }`) adjusts XP directly; negative numbers subtract.
  - `POST /api/debug/reset-rpg` resets the player RPG state back to level 1.
