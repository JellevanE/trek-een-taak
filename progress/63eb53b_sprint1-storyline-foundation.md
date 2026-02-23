# 63eb53b — Sprint 1: Storyline feature foundation

**Date:** 2025-12-08
**Branch:** main
**Message:** Implemented generation logic and frontend state for storyline feature

## Changed files

| File                                                           | Reason                                                                                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `server/src/types/storyline.ts`                                | New `Storyline` and `StoryUpdate` interfaces                                                                             |
| `server/src/types/campaign.ts`                                 | Added optional `storyline_id` field                                                                                      |
| `server/src/data/storylineStore.ts`                            | JSON read/write layer for `storylines.json` with atomic write pattern                                                    |
| `server/src/data/filePaths.ts`                                 | Added `storylines` key and `STORYLINES_FILE` env var override                                                            |
| `server/src/config/storyline.config.ts`                        | Config for models, retry, rate limits, validation limits, theme map                                                      |
| `server/src/services/storyline.service.ts`                     | Core service: create/get/delete storyline, `checkAndGenerateUpdate`, `generateStoryUpdate` (scaffolded, partially wired) |
| `server/src/services/ai/langchain.service.ts`                  | LangChain wrapper around Claude; `generateText` and `getExtractionModel`                                                 |
| `server/src/services/ai/narrative-extractor.service.ts`        | Structured extraction of narrative state via Zod schema + Claude                                                         |
| `server/src/services/prompt.service.ts`                        | Loads `.txt` prompt templates from `prompts/{theme}/{type}.txt`                                                          |
| `server/src/prompts/_shared/system.txt`                        | Shared system prompt for fantasy theme                                                                                   |
| `server/src/prompts/fantasy/intro.txt`                         | Intro story template (uses upcoming quests)                                                                              |
| `server/src/prompts/fantasy/daily-update-1.txt`                | Daily update template (uses completed quests)                                                                            |
| `server/src/controllers/storylineController.ts`                | `getStoryline` and `checkUpdate` endpoints                                                                               |
| `server/src/routes/storylines.ts`                              | Routes: `GET /:campaignId` and `GET /:campaignId/check-update`                                                           |
| `server/src/app.ts`                                            | Registered `/api/storylines` router                                                                                      |
| `server/src/controllers/campaignsController.ts`                | Hooked `createStoryline` into campaign creation; `deleteStoryline` into campaign deletion                                |
| `client/src/store/storylineStore.js`                           | Zustand store for storyline state on the frontend                                                                        |
| `client/src/hooks/useQuestBoard.js`                            | Wired storyline store into quest board hook                                                                              |
| `client/src/App.js`                                            | Added `StorylineCard` rendering                                                                                          |
| `client/src/features/quest-board/components/StorylineCard.jsx` | New component: displays current storyline update                                                                         |
| `server/package.json`                                          | Added LangChain + Anthropic SDK dependencies                                                                             |
| `server/data/storylines.json`                                  | Initial empty storylines data file                                                                                       |
| `server/storylines.json`                                       | Duplicate/legacy data file created during dev                                                                            |

## Known gaps at time of commit (Sprint 2 backlog)

- Prompt variable injection was done via LangChain `PromptTemplate`, but intro context incorrectly used completed tasks instead of upcoming `todo` tasks
- `StoryUpdate.tasksCompleted` always saved as `[]`
- `progressPercentage` never calculated or updated
- Update type determination: always forced `daily` on any new day, no `reflection`/`completion` types
- No retry or timeout in `LangChainService`
- Extraction failure re-threw instead of falling back to previous state
- `generationFailures` counter initialised but never incremented
- System prompt loaded from file but never passed to the generation call
- Missing templates: `reflection.txt`, `completion.txt`
- Model pinned to `claude-3-haiku-20240307` (old)
