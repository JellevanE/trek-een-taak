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

### UX

- **Real-time username availability** — Wire the frontend to the existing `/api/users/check-username/:username` endpoint with debounced calls (500ms) and visual feedback (✓ available / ✗ taken / ⏳ checking); suggest alternatives when taken.
- **Enhanced password strength meter** — Expand the basic indicator with improvement suggestions, a character-requirement checklist, and color-coded feedback beyond weak/good/strong.
- **Welcome step** — Intro step with app overview, feature highlights, privacy/security assurance, and a "Get Started" CTA before account details.
- **Confirmation step** — Final step with welcome message, profile summary, next-steps guidance, and celebration elements (achievement toast).

### Visual & interaction polish

- **Avatar picker** — Visual avatar selection: grid layout, predefined options, hover/selection states, keyboard nav.
- **Clickable progress indicator** — Let users click completed steps (if validation passed) to navigate the wizard.
- **Animations & transitions** — 300ms slide between steps, 200ms focus highlights, 150ms validation color changes, 400ms progress-bar animations.
- **Mobile / tablet optimization** — 320–768px: larger touch targets (min 44px), simplified nav, condensed progress. 768–1024px: two-column forms, side-by-side fields.

### Component refactoring

- **FormField component** — Reusable input with built-in validation, error/success display, consistent styling.
- **ErrorBoundary component** — Registration-specific boundary with graceful handling, friendly messages, retry, fallback UI.
- **LoadingSpinner component** — Centralized loading state with consistent indicators, context labels, timeout handling, cancel.

### Testing gaps

- **Unit tests** — Components (RegistrationWizard, AccountDetailsStep, ProfileSetupStep, ProgressIndicator), validation logic, state management, API integration.
- **Integration tests** — Full registration flow, error scenarios, mobile experience.
- **Performance tests** — Render times, API response handling, large-dataset / slow-connection behavior.

### Advanced (future)

- **Registration achievements** — Badges / XP bonuses for completing profile setup.
- **Welcome quest tutorial** — Intro quest that guides new users through core features.

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
