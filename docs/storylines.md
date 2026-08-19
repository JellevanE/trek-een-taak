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

**Output rules** live in `_shared/system.txt` and govern every generation:
**emphasis-only** formatting — the model may use `*italic*` / `**bold**` and
nothing else (no headings, rules, lists, blockquotes, code), never emojis, and
keep it concise (per-template targets ~90–200 words). The client renders that
subset (see below); anything structural the model still emits is neutralised, not
shown as literal Markdown.

**Story model** is `claude-sonnet-5` (story text) + `claude-haiku-4-5-20251001`
(narrative extraction). No `temperature` is sent — Sonnet 5 rejects non-default
sampling params (400); LangChain defaults `thinking` to disabled, so there's no
adaptive-thinking spend to truncate a short update.

**Rendering (emphasis-only):** `client/src/utils/storyMarkup.js` parses story
text into paragraphs of `{text, bold, italic}` runs — rendering `*italic*` /
`**bold**` as `<em>`/`<strong>`, neutralising headings/rules/blockquotes to plain
text, and never touching single `_` (usernames). `StoryMarkup.jsx` renders it
(text nodes + `<em>`/`<strong>` only, so XSS-safe). The typewriter reveal is
driven by the `useTypewriter` hook so it can animate block-level paragraphs; the
modal reveals progressively, the quest log shows a plain teaser collapsed and
formatted markup expanded.

The reveal cadence is dynamic (`utils/typewriterTiming.js`): a ~20ms/char base
that varies per sentence, short pauses after clause punctuation (`,;:`), longer
pauses after sentence ends (`.!?`), and an ~800ms hold after each paragraph. Tune
the constants in `buildRevealDelays` to taste.

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

**Work — typewriter polish:**
1. ~~Wire `TypewriterText` to `useReducedMotionPreference`~~ — **DONE.** Under
   reduced motion it renders the full text at once, skips the cursor, and fires
   `onComplete` immediately (so the modal's Continue enables). Covered by
   `client/src/components/TypewriterText.test.jsx`.
2. ~~Guard the `.typewriter-cursor` blink behind
   `@media (prefers-reduced-motion: reduce)`~~ — **DONE** (defense-in-depth in
   `campaign-detail.css`; the JS already omits the cursor).
3. Optional (not started): expose typewriter speed as a Settings preference (a
   `SettingsTab` already exists) — defer unless wanted.

**Markdown handling — DONE (emphasis-only rendering).** The model ignored a hard
"no Markdown" instruction (confirmed on Sonnet 4.6 *and* Sonnet 5 — both still
emit headings/emphasis), and output scrubbing was rejected as too brittle. The
shipped approach: allow a tiny subset (`*italic*` / `**bold**`) via the system
prompt and render it safely; neutralise everything structural. See the Prompts /
Rendering notes above. The typewriter reveals the parsed markup progressively (no
half-emitted markers ever shown) via the `useTypewriter` hook.

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
