# Improvement Backlog

Open follow-ups only. Completed items (the `useQuests` hook split, render-helper
extraction, ESM migration, Zod expansion, strict null checks, OpenAPI generation,
`tsc --watch`, the `experienceEngine`/`rewardTables` reshape, the no-explicit-`any`
lint guard, the registration email-validation/rate-limit/reserved-word endpoints,
and the quest-card visual refresh) have shipped and are dropped from this list —
see git history.

## Quest hooks / drag

- **Batch layout refresh triggers** — Multiple paths schedule `refreshLayout` via `setTimeout`, causing redundant calls on bulk mutations (e.g. bulk status changes). Debounce or use `requestAnimationFrame` batching to cut unnecessary reflows.
- **Generalize draggable layout** — `SmoothDraggableList` (`useSmoothDragQuests`) still only supports a single-column stack. Extracting the physics layer from layout math would let the board offer responsive multi-column grids or a masonry view without rewriting drag logic.

## Registration flow

The wizard now lives in `client/src/features/registration/` (welcome → account →
profile → ready). Live username availability, the requirement-checklist strength
meter, the avatar picker, clickable stepper, step transitions, tablet/mobile
layouts, and the `FormField` / `LoadingSpinner` / `RegistrationErrorBoundary`
components shipped with unit tests. What's left:

### Testing gaps

- **Integration tests** — Full registration flow against a real server (Playwright), error scenarios (taken username at submit, rate limit, offline), mobile experience at 320–768px.
- **Performance tests** — Render times, API response handling, large-dataset / slow-connection behavior.

### Advanced (future)

- **Registration achievements** — Persist the "First Steps" achievement server-side and award XP for completing profile setup (the confirmation step currently shows it client-side only).
- **Welcome quest tutorial** — Intro quest that guides new users through core features.
- **Avatar uploads** — The `avatar` field already accepts URLs and `Avatar` renders them; the picker only offers presets.

## API tooling

- **Swagger UI** — Add tooling (e.g. `swagger-cli` + a `swagger-ui` preview script) so the generated OpenAPI docs stay linted and easy to browse locally. (Generation and `/api/docs` already exist.)

## Accessibility (quest board)

The quest-board overhaul shipped, but accessibility was left as an optional tail.
Currently there are **no** `aria-live` / `role="status"` regions in `client/src`,
and focus handling is ad-hoc `.focus()` calls with no focus trap — so this is a
genuine, still-open gap.

- **Screen reader support** — Announce state changes via an `aria-live` region: quest completion ("Quest completed: [description]"), priority/level changes, side-quest add/complete.
- **Focus management** — Focus traps in edit forms (Tab/Shift+Tab cycles within the form), focus restoration after deleting a quest (move to next/previous), and visible focus indicators on all interactive elements.
- **Keyboard shortcuts refinement** — Verify no browser/OS conflicts, that shortcuts behave (or are disabled) inside edit forms, and that the help panel (`?`) is keyboard-accessible.
