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
