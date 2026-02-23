# cea9adb — Sprint 2: Generation logic, validation, retry, and prompt templates

**Date:** 2026-02-23
**Branch:** feature/sprint-2-storyline-generation
**Message:** Sprint 2: generation logic, validation, retry, and prompt templates

## Changed files

| File | Reason |
|------|--------|
| `server/src/services/storyline.service.ts` | Full rewrite of generation logic (see details below) |
| `server/src/services/ai/langchain.service.ts` | Added retry, timeout, system prompt support |
| `server/src/services/ai/narrative-extractor.service.ts` | Extraction failure now falls back to previous state instead of re-throwing |
| `server/src/services/prompt.service.ts` | Added `loadSystemPrompt()`, fixed `DAILY_UPDATE_VARIANTS` constant |
| `server/src/config/storyline.config.ts` | Updated models to `claude-haiku-4-5-20251001` |
| `server/src/prompts/fantasy/reflection.txt` | New: motivational update for days with no task completions |
| `server/src/prompts/fantasy/completion.txt` | New: triumphant narrative for when a campaign reaches 100% |
| `README.md` | Fixed ports: 3001/3000 → 4001/4000 (start-dev.sh was always using 4001/4000) |

## storyline.service.ts — detailed changes

**Update type determination**
Was: always `daily` on any new day.
Now: `intro` (first visit) → `completion` (progress ≥ 100%) → `daily` (new day + completed tasks since last visit) → `reflection` (new day + no completed tasks).

**Intro context fix**
Was: built `tasksSummary` from tasks with `status === 'done'` since last visit.
Now: intro uses upcoming `todo` tasks as `tasksSummary` so the opening narrative references upcoming quests, not completed ones.

**Input validation and sanitisation**
Added `validateAndSanitize()`: checks lengths against config limits (campaign name ≤200, descriptions ≤1000) and strips `{{}}` template markers and `<prompt>` tags to prevent prompt injection.

**StoryUpdate.tasksCompleted**
Was: always `[]`.
Now: populated with string IDs of all tasks completed since last visit.

**progressPercentage**
Was: never updated after creation (always 0).
Now: calculated as `done/total` for campaign tasks and persisted on every generation.

**generationFailures tracking**
Was: counter initialised to 0, never touched.
Now: incremented on catch, reset to 0 on successful generation.

**System prompt**
Was: `_shared/system.txt` existed but was never passed to the model.
Now: `PromptService.loadSystemPrompt()` reads it and passes it to `generateText()`.

## langchain.service.ts — detailed changes

**Retry logic**
Added exponential backoff loop: attempts 1–3, with 500ms/1000ms/2000ms wait between attempts. `retryAttempts` comes from `storylineConfig.generation`.

**Timeout**
30-second timeout enforced via `Promise.race` against a reject-after-N-ms promise. Timeout value from `storylineConfig.generation.timeoutMs`.

**System prompt**
Replaced `PromptTemplate` (human-only) with `ChatPromptTemplate.fromMessages` so a system message can be prepended when provided.

**Empty response guard**
Empty or whitespace-only responses are now treated as errors and trigger a retry.

## narrative-extractor.service.ts — detailed changes

**Fallback on failure**
Was: `throw error` in catch, crashing the entire generation pipeline.
Now: logs the error and returns the previous `narrativeState` fields unchanged, so the story update is still saved even if extraction fails.
