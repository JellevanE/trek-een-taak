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

Notes
-----

- Data is persisted to `server/tasks.json` (quests) and `server/campaigns.json` (quest collections). Tests will modify these files; they try to reset state but consider using separate fixtures for CI runs.
- `writeTasks` throws on write errors and endpoints return 500 when writes fail. This is intentional so clients can surface errors.
- For production or concurrent use, consider moving away from a single JSON file to a small database (sqlite, lowdb) and implement atomic writes.
- The API now maintains a lightweight RPG experience system. Completing quests or side-quests awards XP based on task level and priority, and players can claim a once-per-day bonus via `POST /api/rpg/daily-reward`.
- Each XP-granting response includes `xp_events` and a `player_rpg` snapshot so clients can react without making an extra profile request.
- Campaign management endpoints:
  - `GET /api/campaigns` lists active campaigns with quest metrics for the authenticated user (pass `?include_archived=true` to see archived ones).
  - `POST /api/campaigns` creates a campaign (`name`, optional `description`/`image_url`).
  - `GET /api/campaigns/:id` returns campaign details plus linked quests.
  - `PATCH /api/campaigns/:id` updates metadata or toggles the `archived` flag.
  - `DELETE /api/campaigns/:id` removes the campaign and detaches its quests (they remain but with `campaign_id = null`).
- Developer helpers:
  - `POST /api/debug/clear-tasks` removes all quests for the current user.
  - `POST /api/debug/seed-tasks` (optional body `{ count: number }`) fills the current user with demo quests.
  - `POST /api/debug/grant-xp` (body `{ amount }`) adjusts XP directly; negative numbers subtract.
  - `POST /api/debug/reset-rpg` resets the player RPG state back to level 1.
- Automated tests run with Jest and a lightweight in-memory HTTP harness (`server/utils/testClient.js`) so they pass even in sandboxed environments that disallow opening sockets. Run them with `npm test`.
- JWT signing requires you to provide secrets via environment variables. Set `JWT_SECRET` for a single secret or `JWT_SECRETS` (comma-separated) to support rotation. You can also point `JWT_SECRET_FILE` at a file containing the primary secret. The server refuses to start if no secret is configured (except in tests).
- When using `./start-dev.sh`, a fallback `JWT_SECRET=dev-local-secret` is exported automatically if none is supplied; override it in your environment for custom values.
