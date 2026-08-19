---
name: seed-account
description: Populate a Task Track account with one or more campaigns and their quests + subquests from a realistic, real-world dataset. Use this skill whenever the user wants to seed, populate, or fill a Task Track account with example/demo data, create a sample campaign with tasks, generate test content for the storyline/AI prompts, or set up a throwaway account with believable quests and subquests. Ships a ready-to-run example dataset (preparing an in-person event about AI agents) and a dependency-free seed script that talks to the HTTP API.
---

# Seed Account

Fill a Task Track account with believable campaigns → quests → subquests so you
can exercise the app end to end (dashboards, RPG/XP, and especially the
AI **storyline** prompts, which read real task titles and progress).

Everything goes through the HTTP API (`/api/...`), never the JSON stores
directly — that keeps XP/streak logic and atomic writes correct, exactly like
the app and the MCP do.

## Two ways to run it

**A. Seed script (recommended — repeatable, no reconnect needed).**
`scripts/seed.mjs` logs in as any account and creates everything from a JSON
dataset. This is the default choice: it works against local or prod, needs no
MCP repointing, and re-runs cleanly.

```bash
cd .claude/skills/seed-account
node scripts/seed.mjs datasets/ai-agents-summit.json \
  --url http://localhost:4001 --user local_0 --pass 12345678
```

Dry-run first to preview without writing anything:

```bash
node scripts/seed.mjs datasets/ai-agents-summit.json \
  --url http://localhost:4001 --user local_0 --pass 12345678 --dry-run
```

Credentials/URL can also come from env (`TASK_TRACK_API_URL`,
`TASK_TRACK_USERNAME`, `TASK_TRACK_PASSWORD`); flags win over env. The script
needs only Node 18+ (uses global `fetch`, no npm install).

**B. Task Track MCP tools.** If you'd rather drive it through the MCP
(`create_campaign` / `create_quest` / `create_subquest`), note the MCP reads
`mcp/.env` **once at startup**. To target a different server/account you must
edit `mcp/.env` (`TASK_TRACK_API_URL`, `TASK_TRACK_USERNAME`,
`TASK_TRACK_PASSWORD`) **and reconnect the MCP** (`/mcp` → task-track →
reconnect, or restart Claude Code) before the change takes effect. Prefer path A
unless the user explicitly wants the MCP.

## Getting a usable account

The seed logs in with username + password, so the target account must exist with
a known password.

- **Register a fresh throwaway** (works local or prod):
  ```bash
  curl -s -X POST "$URL/api/users/register" -H 'Content-Type: application/json' \
    -d '{"username":"demo_seed","password":"SeedMe!23","email":"demo@example.com"}'
  ```
- **Local account with an unknown password:** reset its `password_hash` in
  `server/users.json` using the server's own `bcryptjs` (the server re-reads the
  file per request, so no restart needed), then use that password:
  ```bash
  cd server && node --input-type=module -e '
    import bcrypt from "bcryptjs";
    import { readFileSync, writeFileSync, renameSync } from "node:fs";
    const f="./users.json", pw="12345678";
    const d=JSON.parse(readFileSync(f,"utf8"));
    const u=d.users.find(x=>x.username==="local_0");
    u.password_hash=bcrypt.hashSync(pw,10);
    writeFileSync(f+".tmp",JSON.stringify(d,null,2)); renameSync(f+".tmp",f);
    console.log("password set");'
  ```
  Only do this against **local** unless the user explicitly asks for prod.

## Datasets

`datasets/ai-agents-summit.json` is the bundled real-world example: preparing a
one-day in-person event about AI agents (~80 attendees). It deliberately mixes
priorities (low/medium/high), `task_level` (3–20; the server currently caps the
effective level around 10), and subquest counts (0–4) so the storyline prompts
get varied input.

Dataset shape:

```jsonc
{
  "campaigns": [
    {
      "name": "Campaign title",
      "description": "Optional blurb",
      "quests": [
        {
          "description": "Quest title",
          "priority": "low | medium | high",
          "task_level": 10,                 // optional, 1–99 (XP driver)
          "due_offset_days": 7,             // days from today; OR:
          "due_date": "2026-09-01",         // absolute YYYY-MM-DD (wins if both set)
          "status": "in_progress",          // optional: todo|in_progress|blocked|done
          "subquests": [
            "Sub one",                                        // bare title (defaults to todo)
            { "description": "Sub two", "status": "done" }    // or object with a status
          ]
        }
      ]
    }
  ]
}
```

Use `due_offset_days` (relative to the run date) so an example never goes stale;
use `due_date` only when a fixed calendar date matters.

**Statuses / progress.** Set `status` on a quest and/or on individual subquests
(`todo` | `in_progress` | `blocked` | `done`) to seed a believable mid-flight
state instead of an all-`todo` board — useful for exercising the storyline
prompts, which read progress. The seed applies statuses through the same
`PATCH /api/tasks/:id/status` and `.../subtasks/:sid/status` endpoints the app
uses, subquests before their parent quest (so a quest whose subquests are all
`done` can itself land on `done`). Marking anything `done` awards XP once, just
like a real completion. A bare-string subquest defaults to `todo`. The bundled
`ai-agents-summit.json` demonstrates all four statuses.

## Writing a new example

To seed a different scenario, copy the example dataset, rewrite the campaign and
quests to describe **real work a person would actually do** for that scenario
(concrete verbs — book, pay, draft, order, confirm), keep the variance in
priority / level / subquest count, then run the same script pointing at the new
file. Verify afterward with the MCP `list_campaigns` / `list_quests`, or:
`curl -s "$URL/api/campaigns" -H "Authorization: Bearer $TOKEN"`.
