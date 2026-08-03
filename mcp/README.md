# Task Track MCP server

A stdio MCP server that exposes Task Track campaigns, quests and subquests as
tools. It is a thin wrapper over the HTTP API on `:4001` — it never touches the
JSON stores directly, so XP/streak logic and validation behave exactly as in the
UI.

## Tools

| Tool                                            | Endpoint                                  |
| ----------------------------------------------- | ----------------------------------------- |
| `list_campaigns`                                | `GET /api/campaigns`                      |
| `create_campaign`                               | `POST /api/campaigns`                     |
| `update_campaign` (rename/describe/archive)     | `PATCH /api/campaigns/:id`                |
| `list_quests` (optional campaign filter)        | `GET /api/tasks`                          |
| `create_quest`                                  | `POST /api/tasks`                         |
| `update_quest` (retitle/priority/due date/move) | `PUT /api/tasks/:id`                      |
| `create_subquest`                               | `POST /api/tasks/:id/subtasks`            |
| `update_subquest` (retitle/priority)            | `PUT /api/tasks/:id/subtasks/:subtask_id` |

Ordering/drag-and-drop is intentionally out of scope (UI-only concern).

## Setup

```bash
cd mcp
npm install
cp .env.example .env   # fill in the account the MCP server should act as
npm run build
```

The server logs in via `POST /api/users/login` with the credentials from
`mcp/.env`, caches the JWT for the lifetime of the process, and re-logins once
on a 401 (login is rate-limited per IP, so it never logs in per request).

The Task Track API must be running (`./start-dev.sh`); tools return a friendly
error if it isn't. `TASK_TRACK_API_URL` defaults to `http://localhost:4001`.

## Registration

`.mcp.json` at the repo root registers the server for Claude Code (project
scope). Rebuild after changing `src/` (`npm run build`), or point the entry at
`mcp/node_modules/.bin/tsx mcp/src/index.ts` while developing.

## Debugging

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```
