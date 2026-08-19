# Campaign Storylines

AI-generated narrative for campaigns: every campaign gets a storyline that grows
as the user completes quests. This is the consolidated, **as-built** reference —
it supersedes the original `storylines-implementation-plan.md`, the
`storyline-completion` plan/spec, and the `progress/` sprint notes (all removed
after this consolidation; the detail lives in git history).

Status: **shipped** (merged via PRs #14, #19, #20). Remaining work is the
Phase 3 backlog at the end of this document.

---

## What it does

- One storyline per campaign, created automatically (lazily — see below).
- On opening a campaign's Story tab, the client asks the server whether a new
  narrative update is due. If so, the server generates one in the background and
  the client polls until it lands, then reveals it with a typewriter effect.
- Update types, chosen server-side:
  - `intro` — first ever update for the storyline.
  - `daily` — a new day with quests completed since the last visit.
  - `reflection` — a new day with no completions (motivational, not a failure).
  - `completion` — campaign reached 100% progress.
- Read-state (which update the user has seen) is tracked client-side in
  `localStorage`, so the "new update" dot only lights up for genuinely unseen text.

## Architecture

### Data model

`Storyline` (`server/src/types/storyline.ts`) is a **separate entity** linked to a
campaign by `campaignId`, persisted as a bare JSON array in the storyline store.

- `narrativeState` — `chapter`, `currentObjective`, `summary`, `characters[]`,
  `locations[]`, `keyPlotPoints[]`, `progressPercentage`. Carried into each
  generation for continuity.
- `updates[]` — the `StoryUpdate` history (`intro`/`daily`/`reflection`/`completion`).
- Metadata — `createdAt`, `lastGeneratedAt`, `lastVisitDate`, `generationFailures`.

### Storage

Flat JSON via `server/src/data/storylineStore.ts`, same atomic
write-temp-then-rename pattern as the other stores. Path resolves through
`filePaths.ts` (`STORYLINES_FILE` env override → `server/storylines.json` default,
gitignored). Tests inject an isolated fixture through the env override.

### Generation (server)

`server/src/services/storyline.service.ts` is the core:

- `createStoryline(campaignId)` — scaffolds the record (no LLM call). Wired into
  the campaign-create endpoint and lazily on first Story-tab open (see below).
- `deleteStoryline(campaignId)` — cascade on campaign delete.
- `getStoryline(campaignId)`.
- `determineUpdateType(storyline)` — pure decision function (exported, unit-tested).
- `checkAndGenerateUpdate(storylineId, userId)` — **async fire-and-poll**. Returns
  `{ status: 'generating' | 'current', updates }` immediately; when an update is
  due it kicks off generation in the background guarded by an in-memory in-flight
  set, and the client polls `GET /api/storylines/:campaignId` until the new update
  appears.
- `generateStoryUpdate(...)` — two-call pipeline:
  1. **Story text** — Sonnet (`claude-sonnet-4-6`) via the LangChain wrapper
     (`services/ai/langchain.service.ts`: retry, timeout, error classification).
  2. **Narrative-state extraction** — Haiku (`claude-haiku-4-5-20251001`) via
     `services/ai/narrative-extractor.service.ts` (Zod structured output, falls
     back to the previous state on failure).

  Both AI calls go through an injectable seam (`__setStorylineAiForTesting`) so
  tests never hit the real API.

**Lazy creation / backfill:** campaigns created before the feature (or any missing
a record) get a storyline on first `check-update`, after an ownership check —
old campaigns heal themselves; no migration script.

**Cost & safety guards:**
- Per-user/day generation budget (`aiGenerationRateLimiter`,
  `storylineConfig.rateLimits.maxGenerationsPerDay = 10`). On exhaustion the
  feature degrades gracefully — returns existing narrative, no error.
- Input validation + prompt-injection `sanitize()` (strips `{{ }}` template
  markers and `<prompt>` tags; length caps in `storyline.config.ts`).
- The old `maxActiveCampaignsWithStorylines` cap was dropped — with lazy
  generation an unopened storyline costs nothing.

### Prompts

Plain `.txt` templates with `{variable}` placeholders in
`server/src/prompts/{theme}/`, resolved by `services/prompt.service.ts`. The build
does a clean copy `src/prompts` → `dist/prompts` (production reads from `dist`).

- `fantasy/`: `intro.txt`, `daily-update-{1,2,3}.txt`, `reflection.txt`,
  `completion.txt`; `_shared/system.txt` for the system prompt.
- Daily updates rotate randomly across `DAILY_UPDATE_VARIANTS` (`prompt.service.ts`,
  currently `3`) — variant 1 is a straight quest recap, variant 2 zooms in on a
  single encounter, variant 3 is a chronicler's entry. A test guards the constant
  against the on-disk file count (`server/__tests__/promptVariants.test.ts`).

**Output rules** live in `_shared/system.txt` and govern every generation: plain
prose only (no Markdown/formatting syntax), never emojis, and keep it concise —
per-template targets were tightened to ~90–200 words. The plain-text rule pairs
with the client rendering literal text today; revisit it if Markdown rendering
lands (see P3.3).

### HTTP surface

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/storylines/:campaignId` | Fetch storyline (client polls this) |
| `GET` | `/api/storylines/:campaignId/check-update` | Check/trigger update; lazy-creates |
| `POST` | `/api/debug/generate-storyline-update` | Admin: force-generate by `type` (+ optional `variant` for daily); debug-gated |

All storyline routes sit behind `ensureAuth`.

### Frontend

- `client/src/hooks/useStoryline.js` — owns fetch / check / poll / read-state.
  Replaced the old Zustand store (which bypassed the CRA proxy and dropped 401s).
- `client/src/utils/storylineReadState.js` — pure `localStorage` read-state helpers.
- `features/campaign-detail/` — `CampaignDetailPage` (Story / Quests / Settings
  tabs), `StoryTab`, `QuestLog`, `StoryUpdateModal`.
- `components/TypewriterText.jsx` — character-by-character reveal with punctuation
  pauses, a cursor, and a skip control (`renderControls`).
- `features/quest-board/components/StorylineCard.jsx` — card + "new update" dot.

### Tests

- Server (`server/__tests__/`): `storylineConfig`, `storylineValidation`,
  `storylineUpdateType`, `storylineGeneration`, `storylineLifecycle`,
  `storylineBackfill`, `debugStorylineUpdate`.
- Client: `client/src/utils/storylineReadState.test.js`.

---

## Remaining work — Phase 3

Neither item is a blocker; the feature is production-complete. The 4am scheduled
batch-generation endpoint (the third Phase 3 item) remains deferred and is not
scoped here — it depends on the persistent-process hosting decision.

### P3.2 — Daily-update prompt variants 2 & 3 — DONE

Shipped. `daily-update-2.txt` (single-encounter lens) and `daily-update-3.txt`
(chronicler's entry) added, `DAILY_UPDATE_VARIANTS` bumped to `3`, and
`server/__tests__/promptVariants.test.ts` guards the constant against the on-disk
file count and asserts every variant carries the required placeholders. The same
change added the system-prompt output rules (plain text, no emojis, brevity),
tightened all template word counts, and fixed the `dist/prompts` build copy (it
was nesting under `dist/prompts/prompts` on rebuilds).

The admin debug panel can force any specific variant: the storyline row now has a
"Daily variants" line with `Daily v1/v2/v3` buttons. They post the optional
`variant` field to `/api/debug/generate-storyline-update`, which
`PromptService.loadTemplate` uses to load `daily-update-{variant}.txt` directly
(out-of-range → random, as normal generation).

### P3.3 — E2E pass + typewriter polish (incl. Markdown handling)

**Goal:** verify the full storyline journey holds up across breakpoints and tighten
the reveal animation.

**Current state:**
- `TypewriterText` **already** has configurable speed, punctuation pauses, a
  blinking cursor, and a working Skip control wired through `StoryUpdateModal`
  (Skip → Continue). So the "add skip / punctuation pauses" items from the old
  plan are **done** — remaining polish is smaller.
- A `client/src/hooks/useReducedMotionPreference.js` hook exists but
  `TypewriterText` does **not** consume it, and `.typewriter-cursor`'s blink
  animation (`campaign-detail.css`) isn't guarded for reduced motion.
- There is **no** committed E2E harness — the repo only has the Playwright **MCP
  plugin** for interactive driving (see CLAUDE.md), no `@playwright/test`
  dependency, config, or CI wiring.

**Work — typewriter polish (concrete, ship first):**
1. Wire `TypewriterText` to `useReducedMotionPreference`: when reduced motion is
   preferred, render the full text immediately (skip the per-char loop) and don't
   show the animated cursor — call `onComplete` right away so the modal's Continue
   enables. Accessibility win and removes motion-sickness risk.
2. Guard the `.typewriter-cursor` blink behind
   `@media (prefers-reduced-motion: reduce)` in `campaign-detail.css`.
3. Optional: expose typewriter speed as a Settings preference (a `SettingsTab`
   already exists) — defer unless wanted; not required for the pass.

**Work — Markdown handling (decide one):** the model sometimes emits Markdown,
which currently renders as literal syntax in the story panel. As of P3.2 the
system prompt forbids Markdown, so output is clean plain text today — this item is
about whether to *allow and render* it for richer effect instead.
- **Keep plain text (default, zero-cost):** leave the system-prompt rule in place;
  nothing more to do. Choose this unless the richer look is wanted.
- **Render Markdown:** relax the system-prompt rule, then render safely. The catch
  is that `TypewriterText` reveals text character-by-character; a Markdown parser
  can't run on a half-emitted `**bold`. Practical approach: keep the typewriter for
  the reveal, then swap to a parsed (sanitized) render on completion — or render a
  growing subset of *already-closed* Markdown blocks. Constrain the model to a
  tiny subset (emphasis, paragraphs) and sanitize output; still **no emojis**.
  Non-trivial — only pursue if the effect clearly earns it.

**Work — E2E pass. Pick one lane and state the choice in the PR:**
- **Lane A (matches original intent, lighter):** a scripted **manual** MCP-driven
  QA pass per the CLAUDE.md Playwright section. Boot with `BROWSER=none
  ./start-dev.sh`, register a throwaway user, then walk the journey at **1440 /
  1024 / 768**: open a campaign with no story → Story tab shows "Consulting the
  Oracle…" → intro appears via typewriter → Skip/Continue work → re-opening the
  campaign does **not** re-pop the modal (read-state) → header/tabs don't overflow
  at ≤1024. Watch `browser_console_messages` for Framer Motion / DOM warnings.
  Record findings (screenshots + notes) — no code committed beyond fixes found.
- **Lane B (durable, larger lift):** stand up a real `@playwright/test` harness —
  new dev dependency, `playwright.config`, a storyline journey spec, and CI wiring.
  Bigger investment; only worth it if committed regression coverage is the goal.

**Size:** typewriter polish is S (one hook wire-up + one CSS media query + a small
test asserting instant render under reduced motion). The E2E pass is S for Lane A,
M+ for Lane B.
