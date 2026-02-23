# c8b68f1 — Add campaign debug endpoints

**Date:** 2026-02-23
**Branch:** feature/sprint-2-storyline-generation
**Message:** Add campaign debug endpoints for faster manual testing

## Changed files

| File | Reason |
|------|--------|
| `server/src/controllers/debugCampaignController.ts` | New controller with three debug endpoints (see below) |
| `server/src/routes/debug.ts` | Wired the three new POST routes into the existing debug router |

## New endpoints

**`POST /api/debug/seed-campaigns`**
Body: `{ count?: 1-5, quest_count?: 1-10 }`
Creates sample campaigns with thematic names (e.g. "The Dragon's Crusade"), each with linked quests (random statuses/priorities/levels) and an auto-created storyline. Mirrors the existing `seed-tasks` pattern.

**`POST /api/debug/clear-campaigns`**
No body required. Removes all campaigns owned by the authenticated user, cascade-deletes their storylines, and detaches any tasks that were linked to those campaigns (sets `campaign_id = null`).

**`POST /api/debug/complete-campaign-tasks`**
Body: `{ campaign_id: number }`
Marks every task in the specified campaign as `done`, including all sub-tasks and side quests. Adds a `debug: bulk complete` note to status history. This makes it easy to test the storyline completion flow without manually clicking through every quest.
